/**
 * CLIENTE API — servicios separados de los componentes visuales.
 *
 * Etapa 1: DEMO_MODE=true sirve datos de `src/mocks` con latencia simulada.
 * Cuando exista el backend FastAPI, pon VITE_DEMO_MODE=false y estas mismas
 * funciones usarán fetch contra VITE_API_URL (ver docs/API_CONTRACT.md).
 */
import {
  DEMO_ACTIVITY,
  DEMO_AGENTS,
  DEMO_ANALYTICS,
  DEMO_AUDIT,
  DEMO_CAPAS,
  DEMO_CHECKS,
  DEMO_DOCS,
  DEMO_KPIS,
  DEMO_RUNS,
  cadenaDemo,
} from "@/mocks/data";
import type {
  ActivityItem,
  AgentInfo,
  AgentRun,
  AnalyticsSummary,
  ApiState,
  AuditEvent,
  Capa,
  DashboardKpis,
  KnowledgeDoc,
  NewRunInput,
  QualityCheck,
} from "@/lib/types";
import { ApiError } from "@/lib/types";

export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";
export const DEMO_MODE: boolean =
  (import.meta.env.VITE_DEMO_MODE as string | undefined) !== "false";

export type { ApiState };

/** Interruptor demo (desde Settings) para forzar errores de red. */
let simularFallo = false;
export function setSimularFallo(valor: boolean): void {
  simularFallo = valor;
}
export function getSimularFallo(): boolean {
  return simularFallo;
}

const LATENCIA_MS = 550;

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function demo<T>(valor: T): Promise<T> {
  await esperar(LATENCIA_MS + Math.random() * 250);
  if (simularFallo) {
    throw new ApiError("NETWORK", "Simulated network failure (demo). Turn it off in Settings.");
  }
  return structuredClone(valor);
}

/** Rama real contra FastAPI (VITE_DEMO_MODE=false). */
const TIMEOUT_MS = 30000;
/** El pipeline Knowledge→Audit con 4 llamadas LLM tarda 1-2 min. */
const TIMEOUT_RUN_MS = 240000;

async function errorDesdeRespuesta(res: Response, ruta: string): Promise<ApiError> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object") {
      const b = body as Record<string, unknown>;
      if (typeof b.codigo === "string" && typeof b.mensaje === "string") {
        return new ApiError(b.codigo, b.mensaje);
      }
      if (res.status === 422 && Array.isArray(b.detail)) {
        const primero = b.detail[0] as { loc?: unknown[]; msg?: unknown } | undefined;
        const loc = Array.isArray(primero?.loc) ? primero.loc : [];
        const campo = loc.length > 0 ? String(loc[loc.length - 1]) : "form";
        return new ApiError("VALIDACION", `Invalid value in '${campo}': ${String(primero?.msg ?? "check the form")}`);
      }
    }
  } catch {
    /* cuerpo no JSON: cae al genérico */
  }
  return new ApiError(`HTTP_${res.status}`, `Error ${res.status} on ${ruta}`);
}

async function real<T>(ruta: string, init?: RequestInit, timeoutMs: number = TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const cabeceras: Record<string, string> = {};
  if (!(init?.body instanceof FormData)) cabeceras["Content-Type"] = "application/json";
  Object.assign(cabeceras, init?.headers ?? {});
  let res: Response;
  try {
    res = await fetch(`${API_URL}${ruta}`, { ...init, headers: cabeceras, signal: ctrl.signal });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError("TIMEOUT", `The request to ${ruta} exceeded ${Math.round(timeoutMs / 1000)}s. Retry.`);
    }
    throw new ApiError("NETWORK", `Could not reach ${API_URL}. Is the backend running?`);
  }
  clearTimeout(timer);
  if (!res.ok) throw await errorDesdeRespuesta(res, ruta);
  return (await res.json()) as T;
}

/* ------------------------------- Lecturas ------------------------------- */

export const api = {
  agentes: (): Promise<AgentInfo[]> =>
    DEMO_MODE ? demo(DEMO_AGENTS) : real<AgentInfo[]>("/api/agents"),

  procesos: (): Promise<AgentRun[]> =>
    DEMO_MODE ? demo(DEMO_RUNS) : real<AgentRun[]>("/api/runs"),

  proceso: (id: string): Promise<AgentRun> =>
    DEMO_MODE
      ? demo(DEMO_RUNS.find((r) => r.id === id) ?? DEMO_RUNS[0])
      : real<AgentRun>(`/api/runs/${id}`),

  kpis: (): Promise<DashboardKpis> =>
    DEMO_MODE ? demo(DEMO_KPIS) : real<DashboardKpis>("/api/dashboard/kpis"),

  actividad: (): Promise<ActivityItem[]> =>
    DEMO_MODE ? demo(DEMO_ACTIVITY) : real<ActivityItem[]>("/api/dashboard/activity"),

  documentos: (): Promise<KnowledgeDoc[]> =>
    DEMO_MODE ? demo(DEMO_DOCS) : real<KnowledgeDoc[]>("/api/knowledge/docs"),

  controles: (): Promise<QualityCheck[]> =>
    DEMO_MODE ? demo(DEMO_CHECKS) : real<QualityCheck[]>("/api/quality/checks"),

  capas: (): Promise<Capa[]> =>
    DEMO_MODE ? demo(DEMO_CAPAS) : real<Capa[]>("/api/capas"),

  auditoria: (): Promise<AuditEvent[]> =>
    DEMO_MODE ? demo(DEMO_AUDIT) : real<AuditEvent[]>("/api/audit/events"),

  analitica: (): Promise<AnalyticsSummary> =>
    DEMO_MODE ? demo(DEMO_ANALYTICS) : real<AnalyticsSummary>("/api/analytics/summary"),

  /* ------------------------------ Escrituras ----------------------------- */

  crearProceso: (input: NewRunInput): Promise<AgentRun> =>
    DEMO_MODE
      ? demo({
          id: `NC-2026-${1043 + Math.floor(Math.random() * 40)}`,
          titulo: input.titulo,
          descripcion: input.descripcion,
          estado: "pending",
          actual: "knowledge",
          creadoIso: new Date().toISOString(),
          actualizadoIso: new Date().toISOString(),
          pasos: [],
          aprobadoPor: null,
          demo: true,
        })
      : real<AgentRun>("/api/runs", { method: "POST", body: JSON.stringify(input) }),

  ejecutarProceso: (id: string): Promise<AgentRun> =>
    DEMO_MODE
      ? demo({
          ...(DEMO_RUNS.find((r) => r.id === id) ?? DEMO_RUNS[0]),
          estado: "running",
          actual: "knowledge",
          actualizadoIso: new Date().toISOString(),
          demo: true,
        })
      : real<AgentRun>(
          `/api/runs/${id}/run`,
          { method: "POST" },
          TIMEOUT_RUN_MS,
        ),

  subirDocumento: (archivo: File, meta?: { titulo?: string; categoria?: string }): Promise<KnowledgeDoc> => {
    if (DEMO_MODE) {
      return demo({
        id: `DOC-demo-${Date.now() % 10000}`,
        titulo: meta?.titulo?.trim() || archivo.name,
        fuente: "Manual upload (demo)",
        categoria: meta?.categoria?.trim() || "General",
        actualizadoIso: new Date().toISOString(),
        fragmentos: 0,
        demo: true,
      });
    }
    const form = new FormData();
    form.append("archivo", archivo);
    if (meta?.titulo?.trim()) form.append("titulo", meta.titulo.trim());
    if (meta?.categoria?.trim()) form.append("categoria", meta.categoria.trim());
    return real<KnowledgeDoc>("/api/knowledge/docs", { method: "POST", body: form }, 60000);
  },

  aprobarCapa: (id: string, aprobador: string): Promise<Capa> =>
    DEMO_MODE
      ? demo({
          ...(DEMO_CAPAS.find((c) => c.id === id) ?? DEMO_CAPAS[0]),
          estado: "aprobada",
          acciones: (DEMO_CAPAS.find((c) => c.id === id) ?? DEMO_CAPAS[0]).acciones,
          demo: true,
        } as Capa)
      : real<Capa>(`/api/capas/${id}/approve`, {
          method: "POST",
          body: JSON.stringify({ aprobador }),
        }),

  verificarCadena: (): Promise<{ ok: boolean; eventos: number }> =>
    DEMO_MODE
      ? (async () => {
          await esperar(600);
          if (simularFallo) throw new ApiError("NETWORK", "Simulated network failure (demo).");
          let previo = "GENESIS";
          for (const ev of DEMO_AUDIT) {
            if (ev.hashPrevio !== previo) return { ok: false, eventos: DEMO_AUDIT.length };
            const calc = cadenaDemo(ev.hashPrevio, ev.ts, ev.agente, ev.entrada, ev.salida);
            if (calc !== ev.hash) return { ok: false, eventos: DEMO_AUDIT.length };
            previo = ev.hash;
          }
          return { ok: true, eventos: DEMO_AUDIT.length };
        })()
      : real<{ ok: boolean; eventos: number }>("/api/audit/verify", { method: "POST" }),

  manipularDemo: (): Promise<{ ok: boolean; evento: number }> =>
    DEMO_MODE
      ? (async () => {
          await esperar(600);
          const primero = DEMO_AUDIT[0];
          if (!primero) throw new ApiError("SIN_EVENTOS", "No events to tamper with");
          if (!primero.salida.includes("[TAMPERED-DEMO]")) {
            primero.salida += " [TAMPERED-DEMO]";
          }
          return { ok: true, evento: primero.id };
        })()
      : real<{ ok: boolean; evento: number }>("/api/audit/demo-tamper", {
          method: "POST",
          body: JSON.stringify({ confirmar: "BREAK" }),
        }),
};
