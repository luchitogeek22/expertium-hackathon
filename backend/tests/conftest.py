"""Fixtures: SQLite temporal + cliente TestClient + agentes falsos.

Los mocks cubren SOLO la llamada al LLM (sin clave en CI); el resto
(SQLite, ledger SHA-256, orquestador, HTTP) es código real.
"""
from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Callable

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from backend.app import agents as agents_mod  # noqa: E402
from backend.app import config as config_mod  # noqa: E402
from backend.app import db as db_mod  # noqa: E402
from backend.app.main import app  # noqa: E402

USO = {"prompt": 10, "completion": 5, "total": 15, "razonamiento": 2}


@pytest.fixture()
def db_tmp(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> str:
    path = str(tmp_path / "test.db")
    monkeypatch.setattr(config_mod.settings, "db_path", path)
    db_mod.init_db(path, seed_docs=True)
    return path


@pytest.fixture()
def client(db_tmp: str):  # type: ignore[no-untyped-def]
    with TestClient(app) as c:
        yield c


def fake_agents(monkeypatch: pytest.MonkeyPatch,
                por_esquema: dict[str, Callable[[str], Any]]) -> None:
    """Sustituye call_agent_full por respuestas enlatadas por esquema."""

    def falso(rol: str, entrada: str, esquema: Any, **_: Any) -> Any:
        return SimpleNamespace(data=por_esquema[esquema.__name__](entrada),
                               usage=dict(USO))

    monkeypatch.setattr(agents_mod, "call_agent_full", falso)


def enlatados_ok() -> dict[str, Callable[[str], Any]]:
    """Respuestas válidas: flujo completo con CAPA propuesta."""
    from backend.app.agents import (AuditOpinion, CapaOut, KnowledgeOut,
                                    QualityOut)

    return {
        "KnowledgeOut": lambda e: KnowledgeOut(
            causa_probable="Deriva de calibración", documentos=["MAN-012"],
            resumen="Resumen"),
        "QualityOut": lambda e: QualityOut(
            resultado="no_apto", riesgo="medio", requiere_capa=True,
            justificacion="Tendencia repetida"),
        "CapaOut": lambda e: CapaOut(
            titulo="Recalibrar sensor", descripcion="Plan correctivo completo",
            acciones=["Recalibrar", "Verificar"], responsable="J. Ruiz",
            plazo_dias=14, severidad="mayor"),
        "AuditOpinion": lambda e: AuditOpinion(
            observaciones="Trazabilidad completa", riesgo_residual="bajo"),
    }
