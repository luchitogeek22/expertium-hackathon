import type * as React from "react";
import {
  ArrowRight,
  Bell,
  Bot,
  Clock3,
  Coins,
  FileCheck2,
  FileText,
  Quote,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { dinero, hace, miles, msCorto, porciento } from "@/lib/format";
import type { LatenciaAgente } from "@/lib/types";
import type { PageKey } from "@/components/layout/Shell";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { PageHeader, StatCard } from "@/components/ui/stat";
import { AGENTE_META, RunCard, StatusBadge } from "@/components/agents/flow";
import { Sparkline } from "@/components/charts";

const TIPO_ICONO = {
  proceso: Bot,
  aprobacion: FileCheck2,
  documento: FileText,
  auditoria: ShieldCheck,
  sistema: Zap,
} as const;

export function Dashboard({
  onOpenRun,
  onNav,
}: {
  onOpenRun: (id: string) => void;
  onNav: (p: PageKey) => void;
}): React.JSX.Element {
  const kpis = useApi(api.kpis);
  const runs = useApi(api.procesos);
  const actividad = useApi(api.actividad);
  const agentes = useApi(api.agentes);

  const latencias = kpis.datos?.latenciaPorAgente ?? [];
  const lento: LatenciaAgente | null = latencias.length
    ? latencias.reduce((a, b) => (b.mediaMs > a.mediaMs ? b : a))
    : null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        titulo="Executive dashboard"
        descripcion="Live operating status of the multi-agent platform."
        acciones={
          <>
            <DemoBadge />
            <Button onClick={() => onNav("workspace")}>
              New process <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </>
        }
      />

      {kpis.estado === "loading" && <LoadingBlock texto="Loading indicators…" />}
      {kpis.estado === "error" && <ErrorBlock mensaje={kpis.error ?? ""} onRetry={kpis.recargar} />}
      {kpis.estado === "success" && kpis.datos && (
        <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <div className="animate-fade-up"><StatCard icono={Bot} etiqueta="Active processes" valor={String(kpis.datos.procesosActivos)} detalle="Knowledge → Audit" /></div>
          <div className="animate-fade-up"><StatCard icono={Coins} etiqueta="Average cost per process" valor={dinero(kpis.datos.costoMedioPorProcesoUsd)} detalle={`${kpis.datos.procesosTotal} processes · ref. rate $${kpis.datos.tarifaUsdPor1kTokens}/1K`} acento="text-emerald-500" /></div>
          <div className="animate-fade-up"><StatCard icono={Timer} etiqueta="Latency per agent" valor={lento ? msCorto(lento.mediaMs) : "—"} detalle={lento ? `${AGENTE_META[lento.agente].nombre} · max` : "no samples"} acento="text-cyan-500" /></div>
          <div className="animate-fade-up"><StatCard icono={Quote} etiqueta="Verified citations" valor={porciento(kpis.datos.citas.pct)} detalle={kpis.datos.citas.totales ? `${kpis.datos.citas.verificadas}/${kpis.datos.citas.totales} in base` : "no citations"} /></div>
          <div className="animate-fade-up"><StatCard icono={Clock3} etiqueta="Average latency" valor={msCorto(kpis.datos.latenciaMediaMs)} detalle="Per agent step" acento="text-cyan-500" /></div>
          <div className="animate-fade-up"><StatCard icono={Bell} etiqueta="Pending approval" valor={String(kpis.datos.aprobacionesPendientes)} detalle="Need a human" acento="text-amber-500" /></div>
          <div className="animate-fade-up col-span-2 xl:col-span-1">
            <StatCard icono={Zap} etiqueta="Tokens today" valor={miles(kpis.datos.tokensHoy)} detalle="Spark 1.3" acento="text-blue-500 dark:text-blue-400" />
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {/* Procesos recientes */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent processes</CardTitle>
              <CardDescription>Non-conformities and their flow across the 4 agents.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNav("workspace")}>
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </CardHeader>
          <CardContent>
            {runs.estado === "loading" && <LoadingBlock />}
            {runs.estado === "error" && <ErrorBlock mensaje={runs.error ?? ""} onRetry={runs.recargar} />}
            {runs.estado === "success" && (
              <div className="grid gap-3 md:grid-cols-2">
                {runs.datos?.slice(0, 4).map((r) => (
                  <RunCard key={r.id} run={r} onOpen={() => onOpenRun(r.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actividad */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest platform events.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {actividad.estado === "loading" && <LoadingBlock />}
            {actividad.estado === "error" && <ErrorBlock mensaje={actividad.error ?? ""} onRetry={actividad.recargar} />}
            {actividad.estado === "success" && (
              <ul className="flex flex-col">
                {actividad.datos?.map((a) => {
                  const Icono = TIPO_ICONO[a.tipo];
                  return (
                    <li key={a.id} className="flex gap-3 border-b border-zinc-200 py-3 first:pt-0 last:border-b-0 last:pb-0 dark:border-white/8">
                      <span className="mt-0.5 rounded-lg bg-zinc-200/60 p-1.5 text-zinc-500 dark:bg-white/6 dark:text-zinc-400">
                        <Icono className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] leading-snug font-semibold">{a.texto}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {a.actor} · {hace(a.fechaIso)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estado de agentes */}
      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Agents</CardTitle>
            <CardDescription>The four agents and their model setup.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNav("workspace")}>
            Open workspace <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </CardHeader>
        <CardContent>
          {agentes.estado === "loading" && <LoadingBlock />}
          {agentes.estado === "error" && <ErrorBlock mensaje={agentes.error ?? ""} onRetry={agentes.recargar} />}
          {agentes.estado === "success" && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {agentes.datos?.map((a) => (
                <div key={a.id} className="rounded-xl border border-zinc-200 p-4 dark:border-white/8">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-[15px] font-bold">{a.nombre}</p>
                    <Badge tone={a.activo ? "success" : "neutral"}>{a.activo ? "Active" : "Paused"}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-10 text-xs text-zinc-500 dark:text-zinc-400">{a.descripcion}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-mono text-[11px] text-zinc-500">{a.modelo} · {a.esfuerzo}</p>
                    <Sparkline valores={[3, 5, 4, 6, 5, 7, 6]} className="h-6 w-20 text-cyan-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {runs.estado === "success" && runs.datos && runs.datos.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
          <StatusBadge estado={runs.datos[0].estado} />
          <span>Latest process: {runs.datos[0].id}</span>
        </div>
      )}
    </div>
  );
}
