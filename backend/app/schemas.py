"""Esquemas Pydantic: entradas validadas y respuestas 1:1 con el contrato TS.

Nombres de campo idénticos a `frontend/src/lib/types.ts` para que el
frontend funcione sin cambios con VITE_DEMO_MODE=false.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

RunStatus = Literal["pending", "running", "success", "error", "waiting_approval"]
AgentId = Literal["knowledge", "quality", "capa", "audit"]


class NewProcessIn(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    descripcion: str = Field(min_length=10, max_length=5000)
    lote: str = Field(default="—", max_length=40)


class ApproveIn(BaseModel):
    aprobador: str = Field(min_length=2, max_length=80)


class TokenUsageOut(BaseModel):
    prompt: int
    completion: int
    total: int
    razonamiento: int | None = None


class EvidenceOut(BaseModel):
    id: str
    titulo: str
    tipo: Literal["documento", "metrica", "hash", "aprobacion"]
    referencia: str


class AgentStepOut(BaseModel):
    agente: AgentId
    estado: RunStatus
    entrada: str
    salida: dict[str, Any] | None
    inicioIso: str | None
    finIso: str | None
    latenciaMs: int | None
    tokens: TokenUsageOut | None
    error: str | None
    evidencias: list[EvidenceOut]


class AgentRunOut(BaseModel):
    id: str
    titulo: str
    descripcion: str
    estado: RunStatus
    actual: AgentId | None
    creadoIso: str
    actualizadoIso: str
    pasos: list[AgentStepOut]
    aprobadoPor: str | None
    demo: bool = False


class ResultsOut(BaseModel):
    id: str
    estado: RunStatus
    actual: AgentId | None
    pasos: list[AgentStepOut]
    aprobadoPor: str | None


class AgentInfoOut(BaseModel):
    id: AgentId
    nombre: str
    descripcion: str
    icono: str
    color: str
    modelo: str
    esfuerzo: str
    timeoutSeg: int
    activo: bool


class HealthOut(BaseModel):
    status: str
    modelo: str
    db: str


class VerifyOut(BaseModel):
    ok: bool
    eventos: int


class TamperIn(BaseModel):
    confirmar: str


class TamperOut(BaseModel):
    ok: bool
    evento: int


class AuditEventOut(BaseModel):
    id: int
    ts: str
    agente: str
    entrada: str
    salida: str
    hashPrevio: str
    hash: str
    demo: bool = False


class ActivityOut(BaseModel):
    id: str
    texto: str
    actor: str
    fechaIso: str
    tipo: Literal["proceso", "aprobacion", "documento", "auditoria", "sistema"]


class LatenciaAgenteOut(BaseModel):
    agente: AgentId
    mediaMs: int
    muestras: int


class CitasOut(BaseModel):
    pct: float  # 0..1 verificadas sobre totales
    verificadas: int
    totales: int


class KpisOut(BaseModel):
    procesosActivos: int
    tasaExito: float
    latenciaMediaMs: int
    aprobacionesPendientes: int
    tokensHoy: int
    costoMedioPorProcesoUsd: float
    tarifaUsdPor1kTokens: float
    procesosTotal: int
    latenciaPorAgente: list[LatenciaAgenteOut]
    citas: CitasOut


class DocOut(BaseModel):
    id: str
    titulo: str
    fuente: str
    categoria: str
    actualizadoIso: str
    fragmentos: int
    demo: bool = False


class CheckOut(BaseModel):
    id: str
    lote: str
    procesoId: str
    resultado: Literal["apto", "no_apto", "en_revision"]
    riesgo: Literal["bajo", "medio", "alto"]
    inspector: str
    fechaIso: str
    detalle: str
    demo: bool = False


class CapaAccionOut(BaseModel):
    id: str
    texto: str
    hecha: bool


class CapaOut(BaseModel):
    id: str
    titulo: str
    descripcion: str
    estado: Literal["borrador", "en_curso", "pendiente_aprobacion",
                    "aprobada", "cerrada", "rechazada"]
    severidad: Literal["critica", "mayor", "menor"]
    responsable: str
    procesoId: str
    vencimientoIso: str
    acciones: list[CapaAccionOut]
    demo: bool = False


class ProcesosDia(BaseModel):
    dia: str
    total: int
    exito: int


class LatencyPoint(BaseModel):
    dia: str
    knowledge: float
    quality: float
    capa: float
    audit: float


class EstadoValor(BaseModel):
    estado: str
    valor: int


class TokensAgente(BaseModel):
    agente: AgentId
    tokens: int


class AnalyticsOut(BaseModel):
    procesosPorDia: list[ProcesosDia]
    latenciaPorAgente: list[LatencyPoint]
    distribucionEstados: list[EstadoValor]
    tokensPorAgente: list[TokensAgente]
