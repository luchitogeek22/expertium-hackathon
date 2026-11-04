"""Registro append-only en SQLite con hash SHA-256 encadenado."""
import hashlib
import sqlite3
from datetime import datetime, timezone

GENESIS = "GENESIS"
DEFAULT_DB = "ledger.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    agente TEXT NOT NULL,
    entrada TEXT NOT NULL,
    salida TEXT NOT NULL,
    hash_previo TEXT NOT NULL,
    hash TEXT NOT NULL
);
"""


def _connect(db_path: str = DEFAULT_DB) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute(_SCHEMA)
    conn.commit()
    return conn


def _calc_hash(hash_previo: str, ts: str, agente: str, entrada: str, salida: str) -> str:
    payload = f"{hash_previo}|{ts}|{agente}|{entrada}|{salida}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def append_event(agente: str, entrada: str, salida: str,
                 db_path: str = DEFAULT_DB) -> dict:
    """Anade un evento y devuelve el registro con su hash encadenado."""
    conn = _connect(db_path)
    try:
        row = conn.execute("SELECT hash FROM events ORDER BY id DESC LIMIT 1").fetchone()
        hash_previo = row[0] if row else GENESIS
        ts = datetime.now(timezone.utc).isoformat()
        digest = _calc_hash(hash_previo, ts, agente, entrada, salida)
        cur = conn.execute(
            "INSERT INTO events (ts, agente, entrada, salida, hash_previo, hash)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (ts, agente, entrada, salida, hash_previo, digest),
        )
        conn.commit()
        return {"id": cur.lastrowid, "ts": ts, "agente": agente,
                "entrada": entrada, "salida": salida,
                "hash_previo": hash_previo, "hash": digest}
    finally:
        conn.close()


def verify_chain(db_path: str = DEFAULT_DB) -> bool:
    """Verifica que todos los hashes estan bien encadenados."""
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            "SELECT ts, agente, entrada, salida, hash_previo, hash FROM events ORDER BY id"
        ).fetchall()
    finally:
        conn.close()
    expected_previo = GENESIS
    for ts, agente, entrada, salida, hash_previo, digest in rows:
        if hash_previo != expected_previo:
            return False
        if digest != _calc_hash(hash_previo, ts, agente, entrada, salida):
            return False
        expected_previo = digest
    return True


def list_events(db_path: str = DEFAULT_DB) -> list[dict]:
    """Devuelve todos los eventos en orden."""
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            "SELECT id, ts, agente, entrada, salida, hash_previo, hash"
            " FROM events ORDER BY id"
        ).fetchall()
    finally:
        conn.close()
    return [
        {"id": i, "ts": ts, "agente": agente, "entrada": entrada,
         "salida": salida, "hash_previo": hp, "hash": h}
        for i, ts, agente, entrada, salida, hp, h in rows
    ]
