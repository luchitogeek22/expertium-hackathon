"""Agentes con LLM falso: catálogo documental y abstención de Knowledge."""
from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from backend.app import agents as agents_mod
from backend.app.agents import KnowledgeOut

USO = {"prompt": 5, "completion": 5, "total": 10, "razonamiento": 1}


def test_knowledge_recibe_catalogo(monkeypatch: pytest.MonkeyPatch) -> None:
    capturado: dict[str, Any] = {}

    def falso(rol: str, entrada: str, esquema: Any, **_: Any) -> Any:
        capturado["entrada"] = entrada
        return SimpleNamespace(
            data=KnowledgeOut(causa_probable="Causa X", documentos=["MAN-012"]),
            usage=dict(USO))

    monkeypatch.setattr(agents_mod, "call_agent_full", falso)
    res = agents_mod.run_knowledge(
        "Fallo raro",
        documentos=[{"id": "MAN-012", "titulo": "T", "categoria": "C"}])
    assert "MAN-012" in capturado["entrada"]
    assert res.salida["abstencion"] is False


def test_knowledge_abstencion_sin_fuente(monkeypatch: pytest.MonkeyPatch) -> None:
    def falso(rol: str, entrada: str, esquema: Any, **_: Any) -> Any:
        return SimpleNamespace(
            data=KnowledgeOut(causa_probable="Abstención: sin fuente documental",
                              documentos=[], abstencion=True,
                              motivo_abstencion="Ningún documento habla de ovnis"),
            usage=dict(USO))

    monkeypatch.setattr(agents_mod, "call_agent_full", falso)
    res = agents_mod.run_knowledge("Ovni en planta", documentos=[])
    assert res.salida["abstencion"] is True
    assert res.salida["documentos"] == []
    assert "ovnis" in res.salida["motivo_abstencion"]
