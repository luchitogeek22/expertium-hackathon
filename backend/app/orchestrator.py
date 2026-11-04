"""Orquestador Knowledge → Quality → CAPA → Audit.

Reglas de honestidad:
- Si un agente falla, el proceso queda en `error` y el resto NO se ejecuta.
- Nada se marca `success` sin haberse ejecutado de verdad.
- Cada paso (éxito o error) deja evento en el ledger.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import ledger as ledger_mod

from . import agents, db
from .agents import AgentResult
from .errors import Conflict, NotFound

ORDEN = ["knowledge", "quality", "capa", "audit"]


class _Halt(Exception):
    """Corta el pipeline tras un fallo (no es un error del orquestador)."""


def _ev(pid: str, agente: str, estado: str, path: str,
        latencia_ms: int | None = None,
        tokens_total: int | None = None,
        detalle: str = "") -> None:
    salida = {"agente": agente, "estado": estado,
              "latencia_ms": latencia_ms, "tokens_total": tokens_total,
              "detalle": detalle[:300]}
    ledger_mod.append_event(agente, pid, json.dumps(salida, ensure_ascii=False), path)


def _ejecutar_paso(path: str, pid: str, orden: int, agente: str, entrada: str,
                   runner: Callable[[], AgentResult],
                   evidencias: Callable[[dict], list[dict]] | None = None,
                   detalle: Callable[[dict], str] | None = None,
                   estado_ok: str = "success") -> dict:
    """Ejecuta un agente, persiste el paso y registra el ledger.

    Lanza _Halt si el agente falla (el paso queda en `error`).
    """
    step_id = db.insert_step(path, pid, orden, agente, "running", entrada)
    try:
        res = runner()
    except Exception as exc:  # noqa: BLE001 - cualquier fallo corta el flujo
        err = f"{type(exc).__name__}: {exc}"[:500]
        db.update_step(path, step_id, estado="error", error=err)
        db.update_process(path, pid, estado="error", actual=None)
        _ev(pid, agente, "error", path, detalle=err)
        raise _Halt from exc
    evs = evidencias(res.salida) if evidencias else []
    db.update_step(path, step_id, estado=estado_ok, salida=res.salida,
                   latencia_ms=res.latencia_ms, tokens=res.tokens or None,
                   evidencias=evs)
    det = detalle(res.salida) if detalle else ""
    _ev(pid, agente, estado_ok, path, res.latencia_ms,
        (res.tokens or {}).get("total"), det)
    return res.salida


def run_process(path: str, pid: str) -> dict:
    """Ejecuta el flujo completo de un proceso y devuelve el run."""
    proc = db.get_process(path, pid)
    if proc is None:
        raise NotFound("PROCESO_NO_ENCONTRADO", f"Process {pid} does not exist")
    if proc["estado"] in ("success", "waiting_approval"):
        raise Conflict("YA_EJECUTADO", f"Process {pid} already ran")
    db.delete_steps(path, pid)  # reintento limpio tras error/pending
    db.update_process(path, pid, estado="running", actual="knowledge")

    entrada_nc = f"{proc['titulo']}\n{proc['descripcion']}"
    docs = db.list_docs(path)
    try:
        k = _ejecutar_paso(
            path, pid, 0, "knowledge", entrada_nc,
            lambda: agents.run_knowledge(entrada_nc, docs),
            evidencias=lambda s: [
                {"id": f"{pid}-knowledge-{i}", "titulo": d,
                 "tipo": "documento", "referencia": d}
                for i, d in enumerate(s.get("documentos", []))],
            detalle=lambda s: ("ABSTENTION: " + str(s.get("motivo_abstencion", ""))[:200]
                               if s.get("abstencion")
                               else str(s.get("causa_probable", ""))),
        )
        db.update_process(path, pid, actual="quality")
        q = _ejecutar_paso(
            path, pid, 1, "quality",
            json.dumps({"causa_probable": k.get("causa_probable"),
                        "abstencion": bool(k.get("abstencion"))}, ensure_ascii=False),
            lambda: agents.run_quality(
                f"Likely cause: {k.get('causa_probable')}. "
                f"Knowledge abstention: {bool(k.get('abstencion'))}. "
                f"Summary: {k.get('resumen', '')}"),
            evidencias=lambda s: [
                {"id": f"{pid}-quality-0",
                 "titulo": f"Risk {s.get('riesgo')}: {s.get('justificacion', '')}"[:120],
                 "tipo": "metrica", "referencia": "Q-eval"}],
            detalle=lambda s: str(s.get("justificacion", "")),
        )
        db.create_check(path, proc["lote"], pid, q["resultado"],
                        q["riesgo"], q["justificacion"])

        needs_approval = False
        if not q.get("requiere_capa"):
            step_id = db.insert_step(path, pid, 2, "capa", "running",
                                     "N/A: Quality requires no CAPA")
            salida = {"acciones": [],
                      "motivo": "Quality determined no CAPA is required"}
            db.update_step(path, step_id, estado="success", salida=salida,
                           latencia_ms=0, tokens=None, evidencias=[])
            _ev(pid, "capa", "success", path, 0, 0, salida["motivo"])
        else:
            db.update_process(path, pid, actual="capa")
            c = _ejecutar_paso(
                path, pid, 2, "capa",
                json.dumps({"riesgo": q.get("riesgo"),
                            "justificacion": q.get("justificacion")}, ensure_ascii=False),
                lambda: agents.run_capa(
                    f"Risk {q.get('riesgo')}: {q.get('justificacion')}. "
                    f"Cause: {k.get('causa_probable')}"),
                estado_ok="waiting_approval",
                detalle=lambda s: str(s.get("titulo", "")),
            )
            venc = (datetime.now(timezone.utc)
                    + timedelta(days=int(c.get("plazo_dias", 14)))).isoformat()
            db.create_capa(path, c["titulo"], c["descripcion"], c["severidad"],
                           c["responsable"], pid, venc,
                           [{"id": f"a{i}", "texto": a, "hecha": False}
                            for i, a in enumerate(c.get("acciones", []))])
            needs_approval = True

        db.update_process(path, pid, actual="audit")
        resumen = (f"Cause: {k.get('causa_probable')}. Risk: {q.get('riesgo')}. "
                   f"CAPA: {'proposed' if needs_approval else 'not required'}.")
        _ejecutar_paso(
            path, pid, 3, "audit", resumen,
            lambda: agents.run_audit(pid, resumen, path),
            evidencias=lambda s: [
                {"id": f"{pid}-audit-0",
                 "titulo": f"Chain {s.get('cadena')} ({s.get('eventos')} events)",
                 "tipo": "hash", "referencia": pid}],
            detalle=lambda s: str(s.get("observaciones", "")),
        )
    except _Halt:
        pass  # el estado error ya quedó persistido

    final = db.get_process(path, pid) or {}
    if final.get("estado") == "running":
        estado = "waiting_approval" if needs_approval else "success"
        db.update_process(path, pid, estado=estado, actual=None)
    return get_run(path, pid)


def get_run(path: str, pid: str) -> dict:
    proc = db.get_process(path, pid)
    if proc is None:
        raise NotFound("PROCESO_NO_ENCONTRADO", f"Process {pid} does not exist")
    return {"process": proc, "steps": db.get_steps(path, pid)}


def approve_capa(path: str, cid: str, aprobador: str) -> dict:
    """Aprobación humana de una CAPA + cierre del proceso si aplica."""
    capa = db.get_capa(path, cid)
    if capa is None:
        raise NotFound("CAPA_NO_ENCONTRADA", f"CAPA {cid} does not exist")
    if capa["estado"] != "pendiente_aprobacion":
        raise Conflict("CAPA_NO_PENDIENTE", f"CAPA {cid} is not pending")
    db.update_capa(path, cid, estado="aprobada")
    pid: str = capa["proceso_id"]
    db.update_step_by_agent(path, pid, "capa", "success")
    proc = db.get_process(path, pid)
    if proc and proc["estado"] == "waiting_approval":
        steps = db.get_steps(path, pid)
        if all(s["estado"] == "success" for s in steps):
            db.update_process(path, pid, estado="success", actual=None,
                              aprobado_por=aprobador)
    _ev(pid, "audit", "success", path,
        detalle=json.dumps({"hito": "capa_aprobada", "capa": cid,
                            "aprobador": aprobador}, ensure_ascii=False))
    updated = db.get_capa(path, cid)
    assert updated is not None
    return updated
