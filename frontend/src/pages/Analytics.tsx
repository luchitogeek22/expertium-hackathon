import type * as React from "react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { miles } from "@/lib/format";
import { AGENTE_META } from "@/components/agents/flow";
import { DemoBadge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/stat";
import { Bars, Donut } from "@/components/charts";

const ESTADO_COLOR: Record<string, string> = {
  "Success": "#10b981",
  "Running": "#2563eb",
  "Waiting": "#f59e0b",
  "Error": "#f43f5e",
};

const AGENTE_BARRA: Record<string, string> = {
  knowledge: "bg-cyan-500",
  quality: "bg-blue-600 dark:bg-blue-400",
  capa: "bg-amber-500",
  audit: "bg-emerald-500",
};

export function Analytics(): React.JSX.Element {
  const data = useApi(api.analitica);

  return (
    <div className="animate-fade-up">
      <PageHeader
        titulo="Analytics"
        descripcion="Platform performance: volume, latency per agent and token usage."
        acciones={<DemoBadge />}
      />

      {data.estado === "loading" && <LoadingBlock texto="Loading analytics…" />}
      {data.estado === "error" && <ErrorBlock mensaje={data.error ?? ""} onRetry={data.recargar} />}
      {data.estado === "success" && data.datos && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Processes per day</CardTitle>
                <CardDescription>Total vs success over the last 7 days.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Bars datos={data.datos.procesosPorDia.map((p) => ({ etiqueta: p.dia, total: p.total, exito: p.exito }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Status distribution</CardTitle>
                <CardDescription>Current mix of process statuses.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Donut
                segmentos={data.datos.distribucionEstados.map((s) => ({
                  etiqueta: s.estado,
                  valor: s.valor,
                  color: ESTADO_COLOR[s.estado] ?? "#71717a",
                }))}
                centro={String(data.datos.distribucionEstados.reduce((a, s) => a + s.valor, 0))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Average latency per agent (s)</CardTitle>
                <CardDescription>Daily response-time trend.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] tracking-wider text-zinc-500 uppercase">
                      <th className="py-2 pr-3 font-bold">Day</th>
                      <th className="py-2 pr-3 font-bold">Knowledge</th>
                      <th className="py-2 pr-3 font-bold">Quality</th>
                      <th className="py-2 pr-3 font-bold">CAPA</th>
                      <th className="py-2 font-bold">Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.datos.latenciaPorAgente.map((p) => (
                      <tr key={p.dia} className="border-t border-zinc-200 dark:border-white/8">
                        <td className="py-2 pr-3 font-semibold">{p.dia}</td>
                        <td className="py-2 pr-3 font-mono text-[13px]">{p.knowledge.toFixed(1)}</td>
                        <td className="py-2 pr-3 font-mono text-[13px]">{p.quality.toFixed(1)}</td>
                        <td className="py-2 pr-3 font-mono text-[13px]">{p.capa.toFixed(1)}</td>
                        <td className="py-2 font-mono text-[13px]">{p.audit.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Tokens per agent</CardTitle>
                <CardDescription>Accumulated Spark 1.3 usage.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-4">
                {(data.datos?.tokensPorAgente ?? []).map((t) => {
                  const max = Math.max(...(data.datos?.tokensPorAgente ?? []).map((x) => x.tokens), 1);
                  return (
                    <li key={t.agente}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-semibold">{AGENTE_META[t.agente].nombre}</span>
                        <span className="font-mono text-[13px] text-zinc-500">{miles(t.tokens)} tok</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/8">
                        <div
                          className={`h-full rounded-full ${AGENTE_BARRA[t.agente]}`}
                          style={{ width: `${(t.tokens / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
