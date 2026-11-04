"""Auditoría: eventos del ledger y verificación de la cadena."""
from __future__ import annotations

import sqlite3
from typing import Any

from fastapi import APIRouter, Query

import ledger as ledger_mod

from .. import config as config_mod
from ..errors import Conflict, DomainError, NotFound
from ..schemas import AuditEventOut, TamperIn, TamperOut, VerifyOut

router = APIRouter(tags=["audit"])


@router.get("/api/audit/events", response_model=list[AuditEventOut])
def listar_eventos(limit: int = Query(default=200, ge=1, le=500)) -> Any:
    eventos = ledger_mod.list_events(config_mod.db_path())
    return [AuditEventOut(id=e["id"], ts=e["ts"], agente=e["agente"],
                          entrada=e["entrada"], salida=e["salida"],
                          hashPrevio=e["hash_previo"], hash=e["hash"], demo=False)
            for e in eventos[-limit:]]


@router.get("/api/audit/verify", response_model=VerifyOut)
@router.post("/api/audit/verify", response_model=VerifyOut,
             include_in_schema=False)
def verificar_cadena() -> Any:
    path = config_mod.db_path()
    eventos = ledger_mod.list_events(path)
    return VerifyOut(ok=ledger_mod.verify_chain(path), eventos=len(eventos))


@router.post("/api/audit/demo-tamper", response_model=TamperOut)
def manipular_demo(body: TamperIn) -> Any:
    """UTILIDAD DEMO: corrompe el evento 1 para mostrar que verify falla.

    Rompe el ledger de verdad; recuperar exige borrar la DB y reiniciar.
    """
    if body.confirmar != "BREAK":
        raise DomainError("CONFIRMACION_INVALIDA", "You must confirm with 'BREAK'", 400)
    path = config_mod.db_path()
    eventos = ledger_mod.list_events(path)
    if not eventos:
        raise NotFound("SIN_EVENTOS", "No events to tamper with")
    if not ledger_mod.verify_chain(path):
        raise Conflict("CADENA_YA_ROTA", "The chain is already broken")
    primero = eventos[0]
    conn = sqlite3.connect(path)
    try:
        conn.execute("UPDATE events SET salida = salida || ' [TAMPERED-DEMO]'"
                     " WHERE id = ?", (primero["id"],))
        conn.commit()
    finally:
        conn.close()
    return TamperOut(ok=True, evento=primero["id"])
