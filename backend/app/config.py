"""Configuración del backend desde variables de entorno."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

DEFAULT_DB = BACKEND_DIR / "data" / "expertium.db"


def _bool(value: str, default: bool) -> bool:
    if not value:
        return default
    return value.strip().lower() in ("1", "true", "yes", "si")


class Settings:
    """Ajustes leídos una vez al importar."""

    def __init__(self) -> None:
        self.meta_api_key = os.getenv("META_API_KEY", "")
        self.meta_base_url = os.getenv("META_BASE_URL", "https://api.meta.ai/v1")
        self.meta_model = os.getenv("META_MODEL", "muse-spark-1.3")
        self.db_path = os.getenv("EXPERTIUM_DB", str(DEFAULT_DB))
        self.cors_origins = [
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
            if o.strip()
        ]
        self.seed_docs = _bool(os.getenv("SEED_DOCS", "true"), True)


settings = Settings()


def db_path() -> str:
    """Ruta de la SQLite (lee settings en vivo para poder mockear en tests)."""
    return settings.db_path
