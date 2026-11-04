"""Endpoints HTTP con LLM falso (TestClient en proceso, sin sockets)."""
from __future__ import annotations

import sqlite3

import pytest
from fastapi.testclient import TestClient

from backend.tests.conftest import enlatados_ok, fake_agents


@pytest.fixture()
def client_ok(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    fake_agents(monkeypatch, enlatados_ok())
    return client


def _crear(c: TestClient) -> str:
    r = c.post("/api/processes", json={"titulo": "Ruido en compresor",
                                       "descripcion": "Vibración anómala en arranque",
                                       "lote": "C-1"})
    assert r.status_code == 201
    return str(r.json()["id"])


def test_health_y_agentes(client: TestClient) -> None:
    h = client.get("/api/health")
    assert h.status_code == 200 and h.json()["db"] == "ok"
    ags = client.get("/api/agents").json()
    assert [a["id"] for a in ags] == ["knowledge", "quality", "capa", "audit"]
    assert all(a["modelo"] and a["esfuerzo"] and a["timeoutSeg"] for a in ags)


def test_crear_valida_entradas(client: TestClient) -> None:
    assert client.post("/api/processes",
                       json={"titulo": "ab", "descripcion": "corta"}).status_code == 422
    assert client.get("/api/processes/NOPE").status_code == 404


def test_run_completo_y_results(client_ok: TestClient) -> None:
    pid = _crear(client_ok)
    r = client_ok.post(f"/api/processes/{pid}/run")
    assert r.status_code == 200
    body = r.json()
    assert body["estado"] == "waiting_approval"
    assert [p["agente"] for p in body["pasos"]] == ["knowledge", "quality", "capa", "audit"]
    assert body["pasos"][0]["tokens"]["total"] == 15
    assert body["pasos"][0]["salida"]["causa_probable"] == "Deriva de calibración"
    assert body["demo"] is False
    res = client_ok.get(f"/api/processes/{pid}/results").json()
    assert res["id"] == pid and len(res["pasos"]) == 4
    assert client_ok.post(f"/api/processes/{pid}/run").status_code == 409


def test_alias_runs_compat_frontend(client_ok: TestClient) -> None:
    pid = _crear(client_ok)
    assert client_ok.get("/api/runs").status_code == 200
    assert client_ok.get(f"/api/runs/{pid}").json()["id"] == pid
    r = client_ok.post("/api/runs", json={"titulo": "Otro fallo",
                                          "descripcion": "Descripción válida larga"})
    assert r.status_code == 201 and r.json()["id"].startswith("NC-")


def test_approve_cierra_proceso(client_ok: TestClient) -> None:
    pid = _crear(client_ok)
    client_ok.post(f"/api/processes/{pid}/run")
    capa = client_ok.get("/api/capas").json()[0]
    assert capa["estado"] == "pendiente_aprobacion"
    ap = client_ok.post(f"/api/capas/{capa['id']}/approve",
                        json={"aprobador": "M. Ferrer"})
    assert ap.status_code == 200 and ap.json()["estado"] == "aprobada"
    proc = client_ok.get(f"/api/processes/{pid}").json()
    assert proc["estado"] == "success" and proc["aprobadoPor"] == "M. Ferrer"
    assert client_ok.post(f"/api/capas/{capa['id']}/approve",
                          json={"aprobador": "Y. Zeta"}).status_code == 409
    assert client_ok.post("/api/capas/CAPA-999/approve",
                          json={"aprobador": "Y. Zeta"}).status_code == 404


def test_audit_events_y_verify(client_ok: TestClient) -> None:
    pid = _crear(client_ok)
    client_ok.post(f"/api/processes/{pid}/run")
    evs = client_ok.get("/api/audit/events").json()
    assert len(evs) >= 4
    assert evs[0]["hashPrevio"] == "GENESIS"
    for prev, cur in zip(evs, evs[1:]):
        assert cur["hashPrevio"] == prev["hash"]
    assert all(e["demo"] is False for e in evs)
    assert client_ok.get("/api/audit/verify").json()["ok"] is True
    assert client_ok.post("/api/audit/verify").json()["ok"] is True


def test_demo_tamper_rompe_cadena(client_ok: TestClient) -> None:
    pid = _crear(client_ok)
    client_ok.post(f"/api/processes/{pid}/run")
    assert client_ok.get("/api/audit/verify").json()["ok"] is True
    mal = client_ok.post("/api/audit/demo-tamper", json={"confirmar": "no"})
    assert mal.status_code == 400
    assert mal.json()["codigo"] == "CONFIRMACION_INVALIDA"
    r = client_ok.post("/api/audit/demo-tamper", json={"confirmar": "BREAK"})
    assert r.status_code == 200 and r.json() == {"ok": True, "evento": 1}
    assert client_ok.get("/api/audit/verify").json()["ok"] is False
    rep = client_ok.post("/api/audit/demo-tamper", json={"confirmar": "BREAK"})
    assert rep.status_code == 409
    assert rep.json()["codigo"] == "CADENA_YA_ROTA"


def test_demo_tamper_sin_eventos(client: TestClient) -> None:
    r = client.post("/api/audit/demo-tamper", json={"confirmar": "BREAK"})
    assert r.status_code == 404 and r.json()["codigo"] == "SIN_EVENTOS"


def test_verify_detecta_manipulacion(client_ok: TestClient, db_tmp: str) -> None:
    pid = _crear(client_ok)
    client_ok.post(f"/api/processes/{pid}/run")
    conn = sqlite3.connect(db_tmp)
    try:
        conn.execute("UPDATE events SET hash = '00' WHERE id = 1")
        conn.commit()
    finally:
        conn.close()
    assert client_ok.get("/api/audit/verify").json() == {
        "ok": False, "eventos": len(client_ok.get("/api/audit/events").json())}


def test_catalogos_y_analitica(client_ok: TestClient) -> None:
    pid = _crear(client_ok)
    client_ok.post(f"/api/processes/{pid}/run")
    kpis = client_ok.get("/api/dashboard/kpis").json()
    assert kpis["aprobacionesPendientes"] == 1 and kpis["tokensHoy"] > 0
    assert kpis["procesosTotal"] == 1
    assert kpis["costoMedioPorProcesoUsd"] > 0
    assert kpis["tarifaUsdPor1kTokens"] == 0.002
    lat = {e["agente"]: e for e in kpis["latenciaPorAgente"]}
    assert set(lat) == {"knowledge", "quality", "capa", "audit"}
    assert all(e["muestras"] >= 1 for e in lat.values())
    assert kpis["citas"] == {"pct": 1.0, "verificadas": 1, "totales": 1}
    assert len(client_ok.get("/api/dashboard/activity").json()) > 0
    docs = client_ok.get("/api/knowledge/docs").json()
    assert len(docs) == 6 and all(d["demo"] for d in docs)
    assert client_ok.get("/api/quality/checks").json()[0]["procesoId"] == pid
    ana = client_ok.get("/api/analytics/summary").json()
    assert len(ana["procesosPorDia"]) == 7
    assert sum(s["valor"] for s in ana["distribucionEstados"]) >= 1
    assert any(t["tokens"] > 0 for t in ana["tokensPorAgente"])


def test_cors_para_frontend(client: TestClient) -> None:
    r = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_subir_documento(client: TestClient) -> None:
    contenido = b"Parrafo uno.\n\nParrafo dos.\n\nParrafo tres."
    r = client.post("/api/knowledge/docs",
                    files={"archivo": ("proc.txt", contenido, "text/plain")})
    assert r.status_code == 201
    body = r.json()
    assert body["titulo"] == "proc.txt" and body["fragmentos"] == 3
    assert body["demo"] is False and body["id"].startswith("DOC-")
    docs = client.get("/api/knowledge/docs").json()
    assert len(docs) == 7
    assert sum(1 for d in docs if d["demo"]) == 6
    vacio = client.post("/api/knowledge/docs",
                        files={"archivo": ("vacio.txt", b"", "text/plain")})
    assert vacio.status_code == 400
    assert vacio.json()["codigo"] == "ARCHIVO_VACIO"
