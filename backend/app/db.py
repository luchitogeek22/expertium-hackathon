"""SQLite del backend: procesos, pasos y catálogos.

El libro hash vive en el módulo raíz `ledger.py` y comparte este mismo
fichero SQLite (tabla `events`).
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import ledger as ledger_mod

SCHEMA = """
CREATE TABLE IF NOT EXISTS processes (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    lote TEXT NOT NULL DEFAULT '—',
    estado TEXT NOT NULL DEFAULT 'pending',
    actual TEXT,
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL,
    aprobado_por TEXT
);
CREATE TABLE IF NOT EXISTS steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_id TEXT NOT NULL REFERENCES processes(id),
    orden INTEGER NOT NULL,
    agente TEXT NOT NULL,
    estado TEXT NOT NULL,
    entrada TEXT NOT NULL DEFAULT '',
    salida_json TEXT,
    inicio TEXT,
    fin TEXT,
    latencia_ms INTEGER,
    tokens_json TEXT,
    error TEXT,
    evidencias_json TEXT NOT NULL DEFAULT '[]',
    UNIQUE(process_id, agente)
);
CREATE TABLE IF NOT EXISTS knowledge_docs (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    fuente TEXT NOT NULL,
    categoria TEXT NOT NULL,
    actualizado TEXT NOT NULL,
    fragmentos INTEGER NOT NULL DEFAULT 0,
    demo INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS quality_checks (
    id TEXT PRIMARY KEY,
    lote TEXT NOT NULL,
    proceso_id TEXT NOT NULL,
    resultado TEXT NOT NULL,
    riesgo TEXT NOT NULL,
    inspector TEXT NOT NULL,
    fecha TEXT NOT NULL,
    detalle TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS capas (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    estado TEXT NOT NULL,
    severidad TEXT NOT NULL,
    responsable TEXT NOT NULL,
    proceso_id TEXT NOT NULL,
    vencimiento TEXT NOT NULL,
    acciones_json TEXT NOT NULL DEFAULT '[]'
);
"""

SEED_DOCS = [
    {"id": "MAN-012", "titulo": "Sensor tolerance limits",
     "fuente": "Plant manual", "categoria": "Maintenance", "fragmentos": 34},
    {"id": "PROC-034", "titulo": "Non-conformity procedure",
     "fuente": "Procedures", "categoria": "Quality", "fragmentos": 21},
    {"id": "PROC-101", "titulo": "Labeling control plan",
     "fuente": "Procedures", "categoria": "Production", "fragmentos": 18},
    {"id": "MAN-044", "titulo": "Validated tank CIP cleaning",
     "fuente": "Plant manual", "categoria": "Maintenance", "fragmentos": 27},
    {"id": "Q-07", "titulo": "Incident history trending rule",
     "fuente": "Quality system", "categoria": "Quality", "fragmentos": 9},
    {"id": "SEG-003", "titulo": "Compressor safe startup",
     "fuente": "Safety", "categoria": "Safety", "fragmentos": 15},
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _migrar_demo_docs(conn: sqlite3.Connection) -> None:
    """BDs anteriores a la columna demo: la añade y marca las semillas."""
    cols = [r[1] for r in conn.execute("PRAGMA table_info(knowledge_docs)").fetchall()]
    if "demo" in cols:
        return
    conn.execute("ALTER TABLE knowledge_docs ADD COLUMN demo INTEGER NOT NULL DEFAULT 0")
    ids = [d["id"] for d in SEED_DOCS]
    conn.execute(
        f"UPDATE knowledge_docs SET demo = 1 WHERE id IN ({','.join('?' for _ in ids)})",
        ids,
    )


def init_db(path: str, seed_docs: bool = True) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = connect(path)
    try:
        conn.executescript(SCHEMA)
        _migrar_demo_docs(conn)
        conn.commit()
    finally:
        conn.close()
    ledger_mod.list_events(path)  # crea la tabla events si falta (sin escribir)
    if seed_docs:
        seed_knowledge_docs(path)


def seed_knowledge_docs(path: str) -> None:
    conn = connect(path)
    try:
        n = conn.execute("SELECT COUNT(*) FROM knowledge_docs").fetchone()[0]
        if n == 0:
            ts = now_iso()
            conn.executemany(
                "INSERT INTO knowledge_docs (id, titulo, fuente, categoria, actualizado, fragmentos, demo)"
                " VALUES (:id, :titulo, :fuente, :categoria, :ts, :fragmentos, 1)",
                [{**d, "ts": ts} for d in SEED_DOCS],
            )
            conn.commit()
    finally:
        conn.close()


def _next_numbered(conn: sqlite3.Connection, table: str, prefix: str, start: int) -> int:
    row = conn.execute(
        f"SELECT id FROM {table} WHERE id LIKE ? ORDER BY id DESC LIMIT 1", (f"{prefix}%",)
    ).fetchone()
    if not row:
        return start
    try:
        return int(row["id"].rsplit("-", 1)[-1]) + 1
    except ValueError:
        return start


# ------------------------------- Procesos -------------------------------

def create_process(path: str, titulo: str, descripcion: str, lote: str) -> dict:
    conn = connect(path)
    try:
        year = datetime.now(timezone.utc).year
        numero = _next_numbered(conn, "processes", f"NC-{year}-", 1043)
        pid = f"NC-{year}-{numero:04d}"
        ts = now_iso()
        conn.execute(
            "INSERT INTO processes (id, titulo, descripcion, lote, estado, creado, actualizado)"
            " VALUES (?, ?, ?, ?, 'pending', ?, ?)",
            (pid, titulo, descripcion, lote or "—", ts, ts),
        )
        conn.commit()
        return get_process(conn, pid)  # type: ignore[arg-type]
    finally:
        conn.close()


def get_process(conn_or_path: Any, pid: str) -> dict | None:
    if isinstance(conn_or_path, str):
        conn = connect(conn_or_path)
        try:
            row = conn.execute("SELECT * FROM processes WHERE id = ?", (pid,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()
    row = conn_or_path.execute("SELECT * FROM processes WHERE id = ?", (pid,)).fetchone()
    return dict(row) if row else None


def list_processes(path: str, limit: int = 100) -> list[dict]:
    conn = connect(path)
    try:
        rows = conn.execute(
            "SELECT * FROM processes ORDER BY creado DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_process(path: str, pid: str, **fields: Any) -> None:
    fields["actualizado"] = now_iso()
    cols = ", ".join(f"{k} = ?" for k in fields)
    conn = connect(path)
    try:
        conn.execute(f"UPDATE processes SET {cols} WHERE id = ?", (*fields.values(), pid))
        conn.commit()
    finally:
        conn.close()


# --------------------------------- Pasos ----------------------------------

def insert_step(path: str, process_id: str, orden: int, agente: str,
                estado: str = "running", entrada: str = "") -> int:
    conn = connect(path)
    try:
        cur = conn.execute(
            "INSERT INTO steps (process_id, orden, agente, estado, entrada, inicio)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (process_id, orden, agente, estado, entrada, now_iso()),
        )
        conn.commit()
        return int(cur.lastrowid or 0)
    finally:
        conn.close()


def update_step(path: str, step_id: int, fin: bool = True, **fields: Any) -> None:
    if "salida" in fields:
        fields["salida_json"] = json.dumps(fields.pop("salida"), ensure_ascii=False)
    if "tokens" in fields:
        tok = fields.pop("tokens")
        fields["tokens_json"] = json.dumps(tok, ensure_ascii=False) if tok is not None else None
    if "evidencias" in fields:
        fields["evidencias_json"] = json.dumps(fields.pop("evidencias"), ensure_ascii=False)
    if fin:
        fields["fin"] = now_iso()
    cols = ", ".join(f"{k} = ?" for k in fields)
    conn = connect(path)
    try:
        conn.execute(f"UPDATE steps SET {cols} WHERE id = ?", (*fields.values(), step_id))
        conn.commit()
    finally:
        conn.close()


def update_step_by_agent(path: str, pid: str, agente: str, estado: str) -> None:
    conn = connect(path)
    try:
        conn.execute(
            "UPDATE steps SET estado = ? WHERE process_id = ? AND agente = ?",
            (estado, pid, agente),
        )
        conn.commit()
    finally:
        conn.close()


def get_steps(path: str, pid: str) -> list[dict]:
    conn = connect(path)
    try:
        rows = conn.execute(
            "SELECT * FROM steps WHERE process_id = ? ORDER BY orden", (pid,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def delete_steps(path: str, pid: str) -> None:
    conn = connect(path)
    try:
        conn.execute("DELETE FROM steps WHERE process_id = ?", (pid,))
        conn.commit()
    finally:
        conn.close()


def list_steps_with_process(path: str) -> list[dict]:
    """Pasos con fecha del proceso (para KPIs y analítica)."""
    conn = connect(path)
    try:
        rows = conn.execute(
            "SELECT s.*, p.creado AS pcreado FROM steps s"
            " JOIN processes p ON p.id = s.process_id"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# -------------------------------- Catálogos -------------------------------

def list_docs(path: str) -> list[dict]:
    conn = connect(path)
    try:
        return [dict(r) for r in conn.execute("SELECT * FROM knowledge_docs ORDER BY id")]
    finally:
        conn.close()


def create_doc(path: str, titulo: str, fuente: str, categoria: str,
               fragmentos: int) -> dict:
    """Registra un documento subido; `fragmentos` lo calcula el router."""
    conn = connect(path)
    try:
        numero = _next_numbered(conn, "knowledge_docs", "DOC-", 1)
        did = f"DOC-{numero:03d}"
        ts = now_iso()
        conn.execute(
            "INSERT INTO knowledge_docs (id, titulo, fuente, categoria, actualizado, fragmentos, demo)"
            " VALUES (?, ?, ?, ?, ?, ?, 0)",
            (did, titulo, fuente, categoria, ts, fragmentos),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM knowledge_docs WHERE id = ?",
                           (did,)).fetchone()
        return dict(row)
    finally:
        conn.close()


def create_check(path: str, lote: str, proceso_id: str, resultado: str,
                 riesgo: str, detalle: str) -> dict:
    conn = connect(path)
    try:
        numero = _next_numbered(conn, "quality_checks", "QC-", 882)
        cid = f"QC-{numero}"
        ts = now_iso()
        conn.execute(
            "INSERT INTO quality_checks (id, lote, proceso_id, resultado, riesgo,"
            " inspector, fecha, detalle) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (cid, lote, proceso_id, resultado, riesgo, "Quality Agent (auto)", ts, detalle),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM quality_checks WHERE id = ?", (cid,)).fetchone()
        return dict(row)
    finally:
        conn.close()


def list_checks(path: str) -> list[dict]:
    conn = connect(path)
    try:
        rows = conn.execute("SELECT * FROM quality_checks ORDER BY fecha DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_capa(path: str, titulo: str, descripcion: str, severidad: str,
                responsable: str, proceso_id: str, vencimiento: str,
                acciones: list[dict]) -> dict:
    conn = connect(path)
    try:
        numero = _next_numbered(conn, "capas", "CAPA-", 302)
        cid = f"CAPA-{numero}"
        conn.execute(
            "INSERT INTO capas (id, titulo, descripcion, estado, severidad,"
            " responsable, proceso_id, vencimiento, acciones_json)"
            " VALUES (?, ?, ?, 'pendiente_aprobacion', ?, ?, ?, ?, ?)",
            (cid, titulo, descripcion, severidad, responsable, proceso_id,
             vencimiento, json.dumps(acciones, ensure_ascii=False)),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM capas WHERE id = ?", (cid,)).fetchone()
        return dict(row)
    finally:
        conn.close()


def get_capa(path: str, cid: str) -> dict | None:
    conn = connect(path)
    try:
        row = conn.execute("SELECT * FROM capas WHERE id = ?", (cid,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def list_capas(path: str) -> list[dict]:
    conn = connect(path)
    try:
        rows = conn.execute(
            "SELECT * FROM capas ORDER BY vencimiento DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_capa(path: str, cid: str, **fields: Any) -> None:
    if "acciones" in fields:
        fields["acciones_json"] = json.dumps(fields.pop("acciones"), ensure_ascii=False)
    cols = ", ".join(f"{k} = ?" for k in fields)
    conn = connect(path)
    try:
        conn.execute(f"UPDATE capas SET {cols} WHERE id = ?", (*fields.values(), cid))
        conn.commit()
    finally:
        conn.close()


# --------------------------------- Ledger ---------------------------------

def events_for_process(path: str, pid: str) -> list[dict]:
    """Eventos del ledger cuya entrada es el id de proceso."""
    return [e for e in ledger_mod.list_events(path) if e["entrada"] == pid]
