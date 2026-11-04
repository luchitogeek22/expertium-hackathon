/**
 * CONTRATO DE INTEGRACIÓN — EXPERTIUM etapa 1 (frontend).
 *
 * Tipos TypeScript que reflejan 1:1 los futuros endpoints REST del backend
 * FastAPI. Mientras no exista backend, `src/mocks/data.ts` provee datos demo
 * con estos mismos tipos y `src/lib/api.ts` los sirve con latencia simulada.
 *
 * Correspondencia con el núcleo Python actual:
 * - AuditEvent  <-> ledger.py (events: id, ts, agente, entrada, salida,
 *                 hash_previo, hash; GENESIS como previo inicial)
 * - AgentStep IO <-> llm.py call_agent(rol, entrada, esquema_pydantic)
 * - RunStatus   <-> pasos de app.py (NC -> Knowledge -> Quality -> CAPA -> expediente)
 */

/** Identificadores de los cuatro agentes. */
export type AgentId = "knowledge" | "quality" | "capa" | "audit";

/** Estado de ejecución de un proceso o paso de agente. */
export type RunStatus = "pending" | "running" | "success" | "error" | "waiting_approval";

/** Estado genérico de una petición (para loading/success/error/pending). */
export type ApiState = "idle" | "loading" | "success" | "error";

export interface AgentInfo {
  id: AgentId;
  nombre: string;
  descripcion: string;
  icono: string; // nombre del icono Lucide
  color: string; // clase Tailwind del acento
  modelo: string;
  esfuerzo: string; // reasoning_effort (minimal|low|medium|high|xhigh)
  timeoutSeg: number;
  activo: boolean;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  razonamiento?: number;
}

/** Paso ejecutado por un agente dentro de un proceso. */
export interface AgentStep {
  agente: AgentId;
  estado: RunStatus;
  entrada: string;
  salida: Record<string, unknown> | null;
  inicioIso: string | null;
  finIso: string | null;
  latenciaMs: number | null;
  tokens: TokenUsage | null;
  error: string | null;
  evidencias: Evidence[];
}

export interface Evidence {
  id: string;
  titulo: string;
  tipo: "documento" | "metrica" | "hash" | "aprobacion";
  referencia: string;
}

/** Proceso: una no conformidad y su flujo por los 4 agentes. */
export interface AgentRun {
  id: string;
  titulo: string;
  descripcion: string;
  estado: RunStatus;
  actual: AgentId | null; // agente en curso (null si terminó)
  creadoIso: string;
  actualizadoIso: string;
  pasos: AgentStep[];
  aprobadoPor: string | null;
  demo: boolean; // true = dato demo local, sin backend
}

export interface NewRunInput {
  titulo: string;
  descripcion: string;
}

export interface KnowledgeDoc {
  id: string;
  titulo: string;
  fuente: string;
  categoria: string;
  actualizadoIso: string;
  fragmentos: number;
  demo: boolean;
}

export interface QualityCheck {
  id: string;
  lote: string;
  procesoId: string;
  resultado: "apto" | "no_apto" | "en_revision";
  riesgo: "bajo" | "medio" | "alto";
  inspector: string;
  fechaIso: string;
  detalle: string;
  demo: boolean;
}

export type CapaEstado =
  | "borrador"
  | "en_curso"
  | "pendiente_aprobacion"
  | "aprobada"
  | "cerrada"
  | "rechazada";

export interface Capa {
  id: string;
  titulo: string;
  descripcion: string;
  estado: CapaEstado;
  severidad: "critica" | "mayor" | "menor";
  responsable: string;
  procesoId: string;
  vencimientoIso: string;
  acciones: CapaAccion[];
  demo: boolean;
}

export interface CapaAccion {
  id: string;
  texto: string;
  hecha: boolean;
}

/** Evento del libro append-only (ver ledger.py). */
export interface AuditEvent {
  id: number;
  ts: string;
  agente: string;
  entrada: string;
  salida: string;
  hashPrevio: string;
  hash: string;
  demo: boolean;
}

export interface ActivityItem {
  id: string;
  texto: string;
  actor: string;
  fechaIso: string;
  tipo: "proceso" | "aprobacion" | "documento" | "auditoria" | "sistema";
}

export interface LatenciaAgente {
  agente: AgentId;
  mediaMs: number;
  muestras: number;
}

export interface CitasKpi {
  pct: number; // 0..1 verificadas sobre totales
  verificadas: number;
  totales: number;
}

export interface DashboardKpis {
  procesosActivos: number;
  tasaExito: number; // 0..1 (se sigue calculando; fuera del Dashboard)
  latenciaMediaMs: number;
  aprobacionesPendientes: number;
  tokensHoy: number;
  costoMedioPorProcesoUsd: number;
  tarifaUsdPor1kTokens: number;
  procesosTotal: number;
  latenciaPorAgente: LatenciaAgente[];
  citas: CitasKpi;
}

export interface LatencyPoint {
  dia: string;
  knowledge: number;
  quality: number;
  capa: number;
  audit: number;
}

export interface AnalyticsSummary {
  procesosPorDia: { dia: string; total: number; exito: number }[];
  latenciaPorAgente: LatencyPoint[];
  distribucionEstados: { estado: string; valor: number }[];
  tokensPorAgente: { agente: AgentId; tokens: number }[];
}

/** Error normalizado de la capa API. */
export class ApiError extends Error {
  readonly codigo: string;
  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.name = "ApiError";
    this.codigo = codigo;
  }
}
