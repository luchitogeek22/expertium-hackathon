"""App FastAPI EXPERTIUM: agentes, orquestador, ledger y frontend."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config as config_mod
from . import db as db_mod
from .errors import DomainError
from .routers import audit, catalogs, processes

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):  # type: ignore[no-untyped-def]
    db_mod.init_db(config_mod.db_path(), seed_docs=config_mod.settings.seed_docs)
    logger.info("EXPERTIUM API lista (db=%s)", config_mod.db_path())
    yield


app = FastAPI(
    title="EXPERTIUM API",
    version="0.2.0",
    description="Multi-agent orchestrator (Knowledge, Quality, CAPA, Audit) with a SHA-256 ledger.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config_mod.settings.cors_origins or ["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DomainError)
async def _domain_handler(_: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(status_code=exc.status,
                        content={"codigo": exc.codigo, "mensaje": exc.mensaje})


@app.exception_handler(Exception)
async def _unhandled_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("error no controlado: %s", type(exc).__name__)
    return JSONResponse(status_code=500,
                        content={"codigo": "INTERNO", "mensaje": "Internal error"})


@app.get("/", tags=["sistema"])
def raiz() -> dict:
    return {"nombre": "EXPERTIUM API", "version": "0.2.0", "docs": "/docs"}


app.include_router(processes.router)
app.include_router(catalogs.router)
app.include_router(audit.router)
