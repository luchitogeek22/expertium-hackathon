"""Orquestador con LLM falso: pipeline, honestidad y reintentos."""
from __future__ import annotations

import json

import pytest

import ledger as ledger_mod

from backend.app import db as db_mod
from backend.app import orchestrator as orch
from backend.app.agents import KnowledgeOut, QualityOut
from backend.app.errors import Conflict
from backend.tests.conftest import enlatados_ok, fake_agents


def _crear(db_tmp: str) -> str:
    p = db_mod.create_process(db_tmp, "Fallo en línea 3",
                              "Descripción suficientemente larga del fallo", "L-3")
    return str(p["id"])


def test_flujo_completo_con_capa(db_tmp: str, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_agents(monkeypatch, enlatados_ok())
    run = orch.run_process(db_tmp, _crear(db_tmp))
    assert run["process"]["estado"] == "waiting_approval"
    estados = [s["estado"] for s in run["steps"]]
    assert estados == ["success", "success", "waiting_approval", "success"]
    assert all(s["tokens_json"] for s in run["steps"])  # tokens reales del uso
    capas = db_mod.list_capas(db_tmp)
    assert len(capas) == 1 and capas[0]["estado"] == "pendiente_aprobacion"
    assert len(db_mod.list_checks(db_tmp)) == 1
    assert ledger_mod.verify_chain(db_tmp) is True


def test_sin_capa_llega_a_success(db_tmp: str, monkeypatch: pytest.MonkeyPatch) -> None:
    canned = enlatados_ok()
    canned["QualityOut"] = lambda e: QualityOut(
        resultado="apto", riesgo="bajo", requiere_capa=False,
        justificacion="Sin hallazgos")
    fake_agents(monkeypatch, canned)
    run = orch.run_process(db_tmp, _crear(db_tmp))
    assert run["process"]["estado"] == "success"
    capa = [s for s in run["steps"] if s["agente"] == "capa"][0]
    assert "no CAPA is required" in (capa["salida_json"] or "")
    assert db_mod.list_capas(db_tmp) == []


def test_fallo_detiene_pipeline(db_tmp: str, monkeypatch: pytest.MonkeyPatch) -> None:
    canned = enlatados_ok()

    def boom(_: str) -> None:
        raise RuntimeError("Spark caído")

    canned["KnowledgeOut"] = boom  # type: ignore[assignment]
    fake_agents(monkeypatch, canned)
    pid = _crear(db_tmp)
    run = orch.run_process(db_tmp, pid)
    assert run["process"]["estado"] == "error"
    assert len(run["steps"]) == 1  # quality/capa/audit NO se ejecutaron
    assert run["steps"][0]["estado"] == "error"
    assert "Spark caído" in (run["steps"][0]["error"] or "")
    assert ledger_mod.verify_chain(db_tmp) is True  # el error quedó registrado


def test_abstencion_propagada_a_quality(
        db_tmp: str, monkeypatch: pytest.MonkeyPatch) -> None:
    canned = enlatados_ok()
    canned["KnowledgeOut"] = lambda e: KnowledgeOut(
        causa_probable="Abstención: sin fuente documental", documentos=[],
        abstencion=True, motivo_abstencion="Sin respaldo en el catálogo")
    fake_agents(monkeypatch, canned)
    run = orch.run_process(db_tmp, _crear(db_tmp))
    k = [s for s in run["steps"] if s["agente"] == "knowledge"][0]
    assert '"abstencion": true' in (k["salida_json"] or "")
    assert k["evidencias_json"] == "[]"
    q = [s for s in run["steps"] if s["agente"] == "quality"][0]
    assert json.loads(q["entrada"])["abstencion"] is True
    assert ledger_mod.verify_chain(db_tmp) is True


def test_rerun_bloqueado_tras_exito_y_permitido_tras_error(
        db_tmp: str, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_agents(monkeypatch, enlatados_ok())
    pid_ok = _crear(db_tmp)
    orch.run_process(db_tmp, pid_ok)
    with pytest.raises(Conflict):
        orch.run_process(db_tmp, pid_ok)

    canned = enlatados_ok()
    canned["KnowledgeOut"] = lambda e: (_ for _ in ()).throw(RuntimeError("x"))
    fake_agents(monkeypatch, canned)
    pid_mal = _crear(db_tmp)
    assert orch.run_process(db_tmp, pid_mal)["process"]["estado"] == "error"
    fake_agents(monkeypatch, enlatados_ok())  # se recupera el LLM
    run = orch.run_process(db_tmp, pid_mal)
    assert run["process"]["estado"] == "waiting_approval"
    assert len(run["steps"]) == 4  # pasos limpios, sin duplicados
