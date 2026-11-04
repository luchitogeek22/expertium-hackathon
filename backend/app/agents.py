"""Los 4 agentes EXPERTIUM: prompt especializado + esquema + runner.

Cada runner devuelve la salida validada con Pydantic junto a los tokens
y la latencia medidos de verdad (sin inventar cifras).
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import BaseModel, Field

import ledger as ledger_mod
from llm import call_agent_full

# ------------------------- Fichas (GET /api/agents) -------------------------

SPECS: dict[str, dict[str, Any]] = {
    "knowledge": {
        "nombre": "Knowledge",
        "descripcion": "Retrieves context and a likely cause from the document base.",
        "icono": "Brain", "color": "text-cyan-400",
        "esfuerzo": "low", "timeout": 60, "max_tokens": 2000, "activo": True,
    },
    "quality": {
        "nombre": "Quality",
        "descripcion": "Assesses risk and decides whether the case needs a CAPA.",
        "icono": "ShieldCheck", "color": "text-blue-400",
        "esfuerzo": "low", "timeout": 60, "max_tokens": 2000, "activo": True,
    },
    "capa": {
        "nombre": "CAPA",
        "descripcion": "Proposes corrective actions with owner and due date.",
        "icono": "Wrench", "color": "text-amber-400",
        "esfuerzo": "medium", "timeout": 90, "max_tokens": 2000, "activo": True,
    },
    "audit": {
        "nombre": "Audit",
        "descripcion": "Records every step in the hash-chained ledger.",
        "icono": "Fingerprint", "color": "text-emerald-400",
        "esfuerzo": "minimal", "timeout": 30, "max_tokens": 500, "activo": True,
    },
}

ROLE_KNOWLEDGE = (
    "You are the EXPERTIUM Knowledge agent, on an industrial quality platform. "
    "Always answer in English. Analyze the reported non-conformity using ONLY "
    "the document catalog provided. If no document supports the analysis, you "
    "MUST abstain: respond abstencion=true, documentos=[] and explain why; "
    "never invent causes or cite IDs outside the catalog. When sources apply, "
    "propose the likely cause citing the matching IDs, with citations in English."
)
ROLE_QUALITY = (
    "You are the EXPERTIUM Quality agent. Always answer in English. Evaluate "
    "the proposed cause: rule the outcome (apto, no_apto, en_revision), the "
    "risk (bajo, medio, alto) and whether the case needs a CAPA plan, with a "
    "brief justification. If Knowledge abstained (abstencion=true), bear it in "
    "mind: without a likely cause you cannot rule apto."
)
ROLE_CAPA = (
    "You are the EXPERTIUM CAPA agent. Always answer in English. Design a "
    "corrective and preventive action plan: title, description, list of "
    "concrete actions, suggested owner, deadline in days (1-90) and severity."
)
ROLE_AUDIT = (
    "You are the EXPERTIUM Audit agent. Always answer in English. Write brief "
    "remarks on the case file traceability and the residual risk. Never invent "
    "events: you will receive the real count and the verified chain state."
)


class KnowledgeOut(BaseModel):
    causa_probable: str = Field(min_length=3, max_length=500)
    documentos: list[str] = Field(default_factory=list, max_length=10)
    resumen: str = Field(default="", max_length=2000)
    abstencion: bool = False
    motivo_abstencion: str = Field(default="", max_length=1000)


class QualityOut(BaseModel):
    resultado: Literal["apto", "no_apto", "en_revision"]
    riesgo: Literal["bajo", "medio", "alto"]
    requiere_capa: bool
    justificacion: str = Field(min_length=3, max_length=2000)


class CapaOut(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    descripcion: str = Field(min_length=10, max_length=2000)
    acciones: list[str] = Field(min_length=1, max_length=8)
    responsable: str = Field(min_length=2, max_length=80)
    plazo_dias: int = Field(ge=1, le=90)
    severidad: Literal["critica", "mayor", "menor"]


class AuditOpinion(BaseModel):
    observaciones: str = Field(min_length=3, max_length=2000)
    riesgo_residual: Literal["bajo", "medio", "alto"]


@dataclass
class AgentResult:
    salida: dict[str, Any]
    tokens: dict[str, Any] = field(default_factory=dict)
    latencia_ms: int = 0


def _run(rol: str, entrada: str, esquema: type[BaseModel],
         esfuerzo: str, timeout: int, max_tokens: int) -> AgentResult:
    inicio = time.perf_counter()
    res = call_agent_full(rol, entrada, esquema,
                          timeout=float(timeout), effort=esfuerzo,
                          max_tokens=max_tokens)
    latencia = int((time.perf_counter() - inicio) * 1000)
    return AgentResult(salida=res.data.model_dump(), tokens=dict(res.usage),
                       latencia_ms=latencia)


def run_knowledge(entrada: str, documentos: list[dict] | None = None) -> AgentResult:
    """Knowledge con catálogo documental: sin respaldo debe abstenerse."""
    s = SPECS["knowledge"]
    catalogo = "\n".join(f"- {d['id']}: {d['titulo']} ({d['categoria']})"
                         for d in (documentos or [])) or "(empty catalog)"
    prompt = (f"Non-conformity:\n{entrada}\n\nDocument catalog:\n{catalogo}\n\n"
              "If no catalog document supports the analysis, abstain.")
    return _run(ROLE_KNOWLEDGE, prompt, KnowledgeOut,
                s["esfuerzo"], s["timeout"], s["max_tokens"])


def run_quality(entrada: str) -> AgentResult:
    s = SPECS["quality"]
    return _run(ROLE_QUALITY, entrada, QualityOut,
                s["esfuerzo"], s["timeout"], s["max_tokens"])


def run_capa(entrada: str) -> AgentResult:
    s = SPECS["capa"]
    return _run(ROLE_CAPA, entrada, CapaOut,
                s["esfuerzo"], s["timeout"], s["max_tokens"])


def run_audit(process_id: str, resumen: str, db_path: str) -> AgentResult:
    """Verificación determinista (cadena real) + dictamen LLM.

    `eventos` y `cadena` se calculan con ledger.py, nunca con el modelo.
    """
    inicio = time.perf_counter()
    ok = ledger_mod.verify_chain(db_path)
    eventos = [e for e in ledger_mod.list_events(db_path) if e["entrada"] == process_id]
    s = SPECS["audit"]
    opinion = _run(
        ROLE_AUDIT,
        f"Process {process_id}. Recorded events: {len(eventos)}. "
        f"SHA-256 chain: {'OK' if ok else 'BROKEN'}. Summary: {resumen}",
        AuditOpinion, s["esfuerzo"], s["timeout"], s["max_tokens"],
    )
    salida = {"eventos": len(eventos), "cadena": "OK" if ok else "BROKEN",
              **opinion.salida}
    latencia = int((time.perf_counter() - inicio) * 1000)
    return AgentResult(salida=salida, tokens=opinion.tokens, latencia_ms=latencia)
