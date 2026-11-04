"""Documentos de conocimiento: subida y conteo honesto de fragmentos.

Sin sockets: solo SQLite temporal y funciones puras, para poder correr
en cualquier entorno.
"""
from __future__ import annotations

from backend.app import db as db_mod
from backend.app.routers import catalogs as catalogs_mod


def test_contar_fragmentos_por_parrafos() -> None:
    contar = catalogs_mod.contar_fragmentos
    assert contar("") == 0
    assert contar("   \n  ") == 0
    assert contar("solo una linea") == 1
    assert contar("Uno.\n\nDos.\n\n\nTres.") == 3


def test_create_doc_persiste(db_tmp: str) -> None:
    doc = db_mod.create_doc(db_tmp, titulo="Procedimiento X",
                            fuente="Subida manual", categoria="Calidad",
                            fragmentos=7)
    assert doc["id"].startswith("DOC-")
    assert doc["fragmentos"] == 7
    assert doc["demo"] == 0
    docs = db_mod.list_docs(db_tmp)
    assert len(docs) == 7  # 6 de semilla + 1 nuevo
    nuevo = next(d for d in docs if d["id"] == doc["id"])
    assert nuevo["titulo"] == "Procedimiento X"
    assert sum(d["demo"] for d in docs) == 6


def test_migracion_marca_semillas(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """BDs sin columna demo: se añade y solo las semillas quedan marcadas."""
    import sqlite3

    path = str(tmp_path / "old.db")
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE knowledge_docs (id TEXT PRIMARY KEY, titulo TEXT,"
        " fuente TEXT, categoria TEXT, actualizado TEXT, fragmentos INTEGER)")
    conn.execute("INSERT INTO knowledge_docs VALUES ('MAN-012','t','f','c','ts',1)")
    conn.execute("INSERT INTO knowledge_docs VALUES ('DOC-001','t','f','c','ts',2)")
    conn.commit()
    conn.close()
    db_mod.init_db(path, seed_docs=False)
    docs = {d["id"]: d for d in db_mod.list_docs(path)}
    assert docs["MAN-012"]["demo"] == 1
    assert docs["DOC-001"]["demo"] == 0
