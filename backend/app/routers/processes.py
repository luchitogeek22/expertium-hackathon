"""Procesos: CRUD, ejecución del pipeline y resultados.

Canónico: /api/processes*. Aliases /api/runs* para el contrato
TypeScript de la etapa 1 (ocultos en OpenAPI).
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter

from .. import config as config_mod
from .. import db as db_mod
from .. import orchestrator as orch
from ..schemas import (AgentRunOut, AgentStepOut, EvidenceOut, NewProcessIn,
                       ResultsOut, TokenUsageOut)

router = APIRouter(tags=["processes"])


def _step_out(row: dict) -> AgentStepOut:
    salida = json.loads(row["salida_json"]) if row["salida_json"] else None
    tok = json.loads(row["tokens_json"]) if row["tokens_json"] else None
    return AgentStepOut(
        agente=row["agente"], estado=row["estado"], entrada=row["entrada"],
        salida=salida, inicioIso=row["inicio"], finIso=row["fin"],
        latenciaMs=row["latencia_ms"],
        tokens=TokenUsageOut(**tok) if tok else None,
        error=row["error"],
        evidencias=[EvidenceOut(**e) for e in json.loads(row["evidencias_json"] or "[]")],
    )


def _run_out(proc: dict, steps: list[dict]) -> AgentRunOut:
    return AgentRunOut(
        id=proc["id"], titulo=proc["titulo"], descripcion=proc["descripcion"],
        estado=proc["estado"], actual=proc["actual"],
        creadoIso=proc["creado"], actualizadoIso=proc["actualizado"],
        pasos=[_step_out(s) for s in steps],
        aprobadoPor=proc["aprobado_por"], demo=False,
    )


def _full(pid: str) -> AgentRunOut:
    data = orch.get_run(config_mod.db_path(), pid)
    return _run_out(data["process"], data["steps"])


@router.post("/api/processes", response_model=AgentRunOut, status_code=201)
@router.post("/api/runs", response_model=AgentRunOut, status_code=201,
             include_in_schema=False)
def crear_proceso(body: NewProcessIn) -> Any:
    proc = db_mod.create_process(config_mod.db_path(), body.titulo.strip(),
                                 body.descripcion.strip(), body.lote.strip())
    return _run_out(proc, [])


@router.get("/api/processes", response_model=list[AgentRunOut])
@router.get("/api/runs", response_model=list[AgentRunOut], include_in_schema=False)
def listar_procesos() -> Any:
    path = config_mod.db_path()
    return [_run_out(p, db_mod.get_steps(path, p["id"]))
            for p in db_mod.list_processes(path)]


@router.get("/api/processes/{pid}", response_model=AgentRunOut)
@router.get("/api/runs/{pid}", response_model=AgentRunOut, include_in_schema=False)
def obtener_proceso(pid: str) -> Any:
    return _full(pid)


@router.post("/api/processes/{pid}/run", response_model=AgentRunOut)
@router.post("/api/runs/{pid}/run", response_model=AgentRunOut,
             include_in_schema=False)
def ejecutar_proceso(pid: str) -> Any:
    """Ejecuta el pipeline K→Q→C→A (síncrono en v1, puede tardar ~1-2 min)."""
    data = orch.run_process(config_mod.db_path(), pid)
    return _run_out(data["process"], data["steps"])


@router.get("/api/processes/{pid}/results", response_model=ResultsOut)
def resultados_proceso(pid: str) -> Any:
    data = orch.get_run(config_mod.db_path(), pid)
    proc = data["process"]
    return ResultsOut(id=proc["id"], estado=proc["estado"], actual=proc["actual"],
                      pasos=[_step_out(s) for s in data["steps"]],
                      aprobadoPor=proc["aprobado_por"])
