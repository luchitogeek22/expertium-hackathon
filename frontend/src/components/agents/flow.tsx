import * as React from "react";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  Fingerprint,
  Hourglass,
  Loader2,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fechaCorta, hashCorto, miles, msCorto } from "@/lib/format";
import type { AgentId, AgentRun, AgentStep, RunStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const ORDEN_AGENTES: AgentId[] = ["knowledge", "quality", "capa", "audit"];

export const AGENTE_META: Record<AgentId, { nombre: string; icono: typeof Brain; color: string }> = {
  knowledge: { nombre: "Knowledge", icono: Brain, color: "text-cyan-500 dark:text-cyan-400" },
  quality: { nombre: "Quality", icono: ShieldCheck, color: "text-blue-500 dark:text-blue-400" },
  capa: { nombre: "CAPA", icono: Wrench, color: "text-amber-500 dark:text-amber-400" },
  audit: { nombre: "Audit", icono: Fingerprint, color: "text-emerald-500 dark:text-emerald-400" },
};

const ESTADO_META: Record<RunStatus, { etiqueta: string; tone: "info" | "success" | "warning" | "danger" | "neutral" }> = {
  pending: { etiqueta: "Pending", tone: "neutral" },
  running: { etiqueta: "Running", tone: "info" },
  success: { etiqueta: "Success", tone: "success" },
  error: { etiqueta: "Error", tone: "danger" },
  waiting_approval: { etiqueta: "Pending approval", tone: "warning" },
};

export function StatusBadge({ estado }: { estado: RunStatus }): React.JSX.Element {
  const m = ESTADO_META[estado];
  return <Badge tone={m.tone}>{m.etiqueta}</Badge>;
}

function iconoEstado(estado: RunStatus): React.JSX.Element {
  switch (estado) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />;
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-cyan-400" aria-hidden />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-rose-500" aria-hidden />;
    case "waiting_approval":
      return <Hourglass className="h-4 w-4 text-amber-500" aria-hidden />;
    default:
      return <Clock className="h-4 w-4 text-zinc-400" aria-hidden />;
  }
}

/** Flujo visual Knowledge → Quality → CAPA → Audit con conectores animados. */
export function PipelineFlow({
  pasos,
  onSelect,
  seleccionado,
}: {
  pasos: AgentStep[];
  onSelect?: (agente: AgentId) => void;
  seleccionado?: AgentId | null;
}): React.JSX.Element {
  const porAgente = new Map(pasos.map((p) => [p.agente, p]));
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch" role="list" aria-label="Agent flow">
      {ORDEN_AGENTES.map((id, i) => {
        const paso = porAgente.get(id);
        const estado: RunStatus = paso?.estado ?? "pending";
        const meta = AGENTE_META[id];
        const Icono = meta.icono;
        const activo = seleccionado === id;
        return (
          <React.Fragment key={id}>
            {i > 0 && (
              <div className="flex items-center justify-center sm:w-10 sm:shrink-0" aria-hidden>
                <svg width="40" height="12" viewBox="0 0 40 12" className="rotate-90 sm:rotate-0">
                  <line
                    x1="0"
                    y1="6"
                    x2="40"
                    y2="6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className={cn("text-zinc-300 dark:text-zinc-600", estado === "running" && "animate-flow-dash text-cyan-500")}
                  />
                </svg>
              </div>
            )}
            <button
              type="button"
              role="listitem"
              onClick={() => onSelect?.(id)}
              className={cn(
                "flex flex-1 cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70",
                activo
                  ? "border-blue-500/60 bg-blue-600/8 shadow-[0_0_0_1px_rgb(37_99_235/0.4)] dark:bg-blue-500/10"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/8 dark:bg-graphite-900 dark:hover:border-white/20",
                estado === "running" && "animate-pulse-ring",
              )}
            >
              <span className={cn("rounded-lg bg-zinc-200/60 p-2 dark:bg-white/6", meta.color)}>
                <Icono className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  {meta.nombre}
                  {iconoEstado(estado)}
                </span>
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {paso?.latenciaMs != null ? msCorto(paso.latenciaMs) : ESTADO_META[estado].etiqueta}
                  {paso?.tokens ? ` · ${miles(paso.tokens.total)} tok` : ""}
                </span>
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Detalle expandible de un paso: entradas, salidas, tiempos y evidencias. */
export function StepDetail({ paso }: { paso: AgentStep }): React.JSX.Element {
  const meta = AGENTE_META[paso.agente];
  const abstencion = paso.agente === "knowledge" && paso.salida?.["abstencion"] === true;
  const motivoAbst =
    typeof paso.salida?.["motivo_abstencion"] === "string" ? paso.salida["motivo_abstencion"] : "";
  return (
    <Card>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[11px] font-bold tracking-widest text-zinc-500 uppercase">Input · {meta.nombre}</p>
          <p className="rounded-lg bg-zinc-100 p-3 text-[13px] leading-relaxed dark:bg-white/4">
            {paso.entrada || "—"}
          </p>
          {abstencion && (
            <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-[13px] font-semibold text-amber-700 ring-1 ring-amber-500/25 ring-inset dark:text-amber-300" role="status">
              Knowledge abstained: no source in the documents.{motivoAbst ? ` ${motivoAbst}` : ""}
            </p>
          )}
          {paso.error && (
            <p className="mt-3 rounded-lg bg-rose-600/10 p-3 text-[13px] font-semibold text-rose-600 ring-1 ring-rose-500/25 ring-inset dark:text-rose-300">
              {paso.error}
            </p>
          )}
          {paso.evidencias.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-bold tracking-widest text-zinc-500 uppercase">Evidence</p>
              <ul className="flex flex-wrap gap-1.5">
                {paso.evidencias.map((e) => (
                  <Badge key={e.id} tone="neutral">
                    {e.titulo}
                  </Badge>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold tracking-widest text-zinc-500 uppercase">JSON output</p>
          <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-200 dark:bg-black/50 dark:text-zinc-300">
            {paso.salida ? JSON.stringify(paso.salida, null, 2) : "—"}
          </pre>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
            <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-white/4">
              <dt className="text-[11px] text-zinc-500">Latency</dt>
              <dd className="font-bold">{msCorto(paso.latenciaMs)}</dd>
            </div>
            <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-white/4">
              <dt className="text-[11px] text-zinc-500">Tokens</dt>
              <dd className="font-bold">{paso.tokens ? miles(paso.tokens.total) : "—"}</dd>
            </div>
            <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-white/4">
              <dt className="text-[11px] text-zinc-500">Start</dt>
              <dd className="font-bold">{paso.inicioIso ? fechaCorta(paso.inicioIso) : "—"}</dd>
            </div>
            <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-white/4">
              <dt className="text-[11px] text-zinc-500">End</dt>
              <dd className="font-bold">{paso.finIso ? fechaCorta(paso.finIso) : "—"}</dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

/** Tarjeta compacta de proceso para listas. */
export function RunCard({
  run,
  onOpen,
}: {
  run: AgentRun;
  onOpen: () => void;
}): React.JSX.Element {
  const hechos = run.pasos.filter((p) => p.estado === "success").length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all outline-none hover:border-blue-500/50 hover:shadow-[0_8px_24px_-12px_rgb(37_99_235/0.5)] focus-visible:ring-2 focus-visible:ring-cyan-400/70 dark:border-white/8 dark:bg-graphite-900 dark:hover:border-blue-400/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-cyan-600 dark:text-cyan-400">{run.id}</p>
          <p className="font-display mt-0.5 truncate text-[15px] font-bold">{run.titulo}</p>
        </div>
        <StatusBadge estado={run.estado} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-[13px] text-zinc-500 dark:text-zinc-400">{run.descripcion}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {run.pasos.length > 0 ? `${hechos}/${run.pasos.length} agents` : "Queued"}
        </span>
        <span>{fechaCorta(run.actualizadoIso)}</span>
      </div>
    </button>
  );
}

export function hashBadge(hash: string): React.JSX.Element {
  return (
    <code className="rounded bg-zinc-200/70 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/8" title={hash}>
      {hashCorto(hash)}
    </code>
  );
}
