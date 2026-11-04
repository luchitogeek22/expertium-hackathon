"""Catálogos y agregados: health, agentes, dashboard, docs, checks, capas."""
from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, File, Form, UploadFile

import ledger as ledger_mod

from .. import agents as agents_mod
from .. import config as config_mod
from .. import db as db_mod
from .. import orchestrator as orch
from ..errors import DomainError
from ..schemas import (ActivityOut, AgentInfoOut, AnalyticsOut, ApproveIn,
                       CapaAccionOut, CapaOut, CheckOut, CitasOut, DocOut,
                       EstadoValor, HealthOut, KpisOut, LatenciaAgenteOut,
                       LatencyPoint, ProcesosDia, TokensAgente)

router = APIRouter(tags=["catalogs"])
DIAS = 7
# Tarifa de referencia para estimar costo (USD por 1K tokens, todos los
# agentes). No es facturación real: se expone en la respuesta para que
# la interfaz la muestre junto a la estimación.
TARIFA_USD_POR_1K_TOKENS = 0.002


@router.get("/api/health", response_model=HealthOut)
def salud() -> Any:
    try:
        conn = db_mod.connect(config_mod.db_path())
        try:
            conn.execute("SELECT 1").fetchone()
        finally:
            conn.close()
        estado_db = "ok"
    except Exception:  # noqa: BLE001 - health debe informar, no caer
        estado_db = "error"
    return HealthOut(status="ok" if estado_db == "ok" else "degraded",
                     modelo=config_mod.settings.meta_model, db=estado_db)


@router.get("/api/agents", response_model=list[AgentInfoOut])
def listar_agentes() -> Any:
    modelo = config_mod.settings.meta_model
    return [AgentInfoOut(id=aid, nombre=s["nombre"], descripcion=s["descripcion"],
                         icono=s["icono"], color=s["color"], modelo=modelo,
                         esfuerzo=s["esfuerzo"], timeoutSeg=s["timeout"],
                         activo=s["activo"])
            for aid, s in agents_mod.SPECS.items()]


@router.get("/api/dashboard/kpis", response_model=KpisOut)
def kpis() -> Any:
    path = config_mod.db_path()
    procs = db_mod.list_processes(path, limit=10000)
    activos = sum(1 for p in procs
                  if p["estado"] in ("pending", "running", "waiting_approval"))
    ok = sum(1 for p in procs if p["estado"] == "success")
    mal = sum(1 for p in procs if p["estado"] == "error")
    steps = db_mod.list_steps_with_process(path)
    lats = [s["latencia_ms"] for s in steps if s["latencia_ms"] is not None]
    pendientes = sum(1 for c in db_mod.list_capas(path)
                     if c["estado"] == "pendiente_aprobacion")
    hoy = datetime.now(timezone.utc).date().isoformat()
    tokens_hoy = 0
    tokens_total = 0
    for s in steps:
        if not s["tokens_json"]:
            continue
        total = int(json.loads(s["tokens_json"]).get("total", 0))
        tokens_total += total
        if s["fin"] and s["fin"][:10] == hoy:
            tokens_hoy += total
    n_procs = len(procs)
    costo_medio = (tokens_total / n_procs / 1000 * TARIFA_USD_POR_1K_TOKENS) if n_procs else 0.0
    lat_ag: dict[str, list[int]] = {}
    for s in steps:
        if s["latencia_ms"] is not None:
            lat_ag.setdefault(s["agente"], []).append(int(s["latencia_ms"]))
    latencias = [LatenciaAgenteOut(agente=a,  # type: ignore[arg-type]
                                   mediaMs=int(sum(v) / len(v)),
                                   muestras=len(v))
                 for a in ("knowledge", "quality", "capa", "audit")
                 if (v := lat_ag.get(a))]
    doc_ids = {d["id"] for d in db_mod.list_docs(path)}
    citas_tot = citas_ok = 0
    for s in steps:
        if s["agente"] != "knowledge" or not s["salida_json"]:
            continue
        try:
            sal = json.loads(s["salida_json"])
        except ValueError:
            continue
        docs = sal.get("documentos") if isinstance(sal, dict) else None
        if not isinstance(docs, list):
            continue
        for d in docs:
            citas_tot += 1
            if d in doc_ids:
                citas_ok += 1
    return KpisOut(procesosActivos=activos,
                   tasaExito=(ok / (ok + mal)) if (ok + mal) else 0.0,
                   latenciaMediaMs=int(sum(lats) / len(lats)) if lats else 0,
                   aprobacionesPendientes=pendientes, tokensHoy=tokens_hoy,
                   costoMedioPorProcesoUsd=round(costo_medio, 6),
                   tarifaUsdPor1kTokens=TARIFA_USD_POR_1K_TOKENS,
                   procesosTotal=n_procs, latenciaPorAgente=latencias,
                   citas=CitasOut(pct=(citas_ok / citas_tot) if citas_tot else 0.0,
                                  verificadas=citas_ok, totales=citas_tot))


def _actividad(ev: dict) -> ActivityOut:
    try:
        sal = json.loads(ev["salida"]) if ev["salida"].startswith("{") else {}
    except ValueError:
        sal = {}
    ag = ev["agente"]
    if isinstance(sal, dict) and sal.get("detalle") and "capa_aprobada" in str(sal["detalle"]):
        det = json.loads(sal["detalle"])
        return ActivityOut(id=str(ev["id"]),
                           texto=f"Capa {det.get('capa')} approved",
                           actor=str(det.get("aprobador", "?")),
                           fechaIso=ev["ts"], tipo="aprobacion")
    estado = sal.get("estado", "") if isinstance(sal, dict) else ""
    if ag == "audit":
        tipo = "auditoria"
    elif ag in ("knowledge", "quality", "capa"):
        tipo = "proceso"
    else:
        tipo = "sistema"
    return ActivityOut(id=str(ev["id"]),
                       texto=f"{ev['entrada']}: {ag} → {estado or 'event'}",
                       actor=f"{ag.capitalize()} agent" if tipo != "sistema" else "System",
                       fechaIso=ev["ts"], tipo=tipo)  # type: ignore[arg-type]


@router.get("/api/dashboard/activity", response_model=list[ActivityOut])
def actividad() -> Any:
    eventos = ledger_mod.list_events(config_mod.db_path())
    return [_actividad(e) for e in reversed(eventos[-20:])]


@router.get("/api/knowledge/docs", response_model=list[DocOut])
def documentos() -> Any:
    return [DocOut(id=d["id"], titulo=d["titulo"], fuente=d["fuente"],
                   categoria=d["categoria"], actualizadoIso=d["actualizado"],
                   fragmentos=d["fragmentos"], demo=bool(d["demo"]))
            for d in db_mod.list_docs(config_mod.db_path())]


MAX_SUBIDA_BYTES = 5 * 1024 * 1024


def contar_fragmentos(texto: str) -> int:
    """Cuenta párrafos no vacíos: el nº real indexable del documento."""
    return len([f for f in re.split(r"\n\s*\n", texto) if f.strip()])


@router.post("/api/knowledge/docs", response_model=DocOut, status_code=201)
async def subir_documento(
    archivo: UploadFile = File(...),
    titulo: str | None = Form(default=None),
    categoria: str | None = Form(default=None),
    fuente: str | None = Form(default=None),
) -> Any:
    """Subida multipart: registra el doc con su conteo real de fragmentos."""
    contenido = await archivo.read()
    if not contenido:
        raise DomainError("ARCHIVO_VACIO", "The file is empty")
    if len(contenido) > MAX_SUBIDA_BYTES:
        raise DomainError("ARCHIVO_MUY_GRANDE",
                          "The file exceeds 5 MB", 413)
    nombre = (archivo.filename or "").strip() or "document"
    texto = contenido.decode("utf-8", errors="ignore")
    doc = db_mod.create_doc(
        config_mod.db_path(),
        titulo=(titulo or "").strip() or nombre,
        fuente=(fuente or "").strip() or "Manual upload",
        categoria=(categoria or "").strip() or "General",
        fragmentos=contar_fragmentos(texto),
    )
    return DocOut(id=doc["id"], titulo=doc["titulo"], fuente=doc["fuente"],
                  categoria=doc["categoria"], actualizadoIso=doc["actualizado"],
                  fragmentos=doc["fragmentos"], demo=False)


@router.get("/api/quality/checks", response_model=list[CheckOut])
def controles() -> Any:
    return [CheckOut(id=c["id"], lote=c["lote"], procesoId=c["proceso_id"],
                     resultado=c["resultado"], riesgo=c["riesgo"],
                     inspector=c["inspector"], fechaIso=c["fecha"],
                     detalle=c["detalle"], demo=False)
            for c in db_mod.list_checks(config_mod.db_path())]


def _capa_out(c: dict) -> CapaOut:
    return CapaOut(
        id=c["id"], titulo=c["titulo"], descripcion=c["descripcion"],
        estado=c["estado"], severidad=c["severidad"], responsable=c["responsable"],
        procesoId=c["proceso_id"], vencimientoIso=c["vencimiento"],
        acciones=[CapaAccionOut(**a)
                  for a in json.loads(c["acciones_json"] or "[]")],
        demo=False)


@router.get("/api/capas", response_model=list[CapaOut])
def capas() -> Any:
    return [_capa_out(c) for c in db_mod.list_capas(config_mod.db_path())]


@router.post("/api/capas/{cid}/approve", response_model=CapaOut)
def aprobar_capa(cid: str, body: ApproveIn) -> Any:
    return _capa_out(orch.approve_capa(config_mod.db_path(), cid,
                                       body.aprobador.strip()))


@router.get("/api/analytics/summary", response_model=AnalyticsOut)
def analitica() -> Any:
    path = config_mod.db_path()
    hoy = datetime.now(timezone.utc).date()
    dias = [(hoy - timedelta(days=i)).isoformat() for i in reversed(range(DIAS))]
    etiqueta = {d: f"{d[5:7]}/{d[8:10]}" for d in dias}
    procs = db_mod.list_processes(path, limit=10000)
    por_dia: dict[str, list[dict]] = {d: [] for d in dias}
    for p in procs:
        dia = p["creado"][:10]
        if dia in por_dia:
            por_dia[dia].append(p)
    steps = db_mod.list_steps_with_process(path)
    lat_dia: dict[str, dict[str, list[int]]] = {
        d: {"knowledge": [], "quality": [], "capa": [], "audit": []} for d in dias}
    tok_ag: dict[str, int] = {"knowledge": 0, "quality": 0, "capa": 0, "audit": 0}
    for s in steps:
        dia = (s["pcreado"] or "")[:10]
        if s["tokens_json"] and s["agente"] in tok_ag:
            tok_ag[s["agente"]] += int(json.loads(s["tokens_json"]).get("total", 0))
        if dia in lat_dia and s["latencia_ms"] is not None and s["agente"] in lat_dia[dia]:
            lat_dia[dia][s["agente"]].append(int(s["latencia_ms"]))

    def media(v: list[int]) -> float:
        return round(sum(v) / len(v) / 1000, 2) if v else 0.0

    conteo = {"Success": 0, "Running": 0, "Waiting": 0, "Error": 0}
    for p in procs:
        if p["estado"] == "success":
            conteo["Success"] += 1
        elif p["estado"] == "error":
            conteo["Error"] += 1
        elif p["estado"] in ("waiting_approval", "pending"):
            conteo["Waiting"] += 1
        else:
            conteo["Running"] += 1
    return AnalyticsOut(
        procesosPorDia=[ProcesosDia(
            dia=etiqueta[d], total=len(por_dia[d]),
            exito=sum(1 for p in por_dia[d] if p["estado"] == "success")) for d in dias],
        latenciaPorAgente=[LatencyPoint(
            dia=etiqueta[d], knowledge=media(lat_dia[d]["knowledge"]),
            quality=media(lat_dia[d]["quality"]), capa=media(lat_dia[d]["capa"]),
            audit=media(lat_dia[d]["audit"])) for d in dias],
        distribucionEstados=[EstadoValor(estado=k, valor=v) for k, v in conteo.items()],
        tokensPorAgente=[TokensAgente(agente=a, tokens=t) for a, t in tok_ag.items()],  # type: ignore[list-item]
    )
