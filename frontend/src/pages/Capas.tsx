import type * as React from "react";
import { useState } from "react";
import { CalendarClock, Check, ExternalLink, User } from "lucide-react";
import { DEMO_MODE, api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { fechaDia } from "@/lib/format";
import type { Capa, CapaEstado } from "@/lib/types";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyBlock, ErrorBlock, LoadingBlock, Progress, Spinner } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/stat";

const ESTADO_TONE: Record<CapaEstado, "info" | "success" | "warning" | "danger" | "neutral"> = {
  borrador: "neutral",
  en_curso: "info",
  pendiente_aprobacion: "warning",
  aprobada: "success",
  cerrada: "success",
  rechazada: "danger",
};
const ESTADO_TXT: Record<CapaEstado, string> = {
  borrador: "Draft",
  en_curso: "In progress",
  pendiente_aprobacion: "Pending approval",
  aprobada: "Approved",
  cerrada: "Closed",
  rechazada: "Rejected",
};
const SEV_TONE = { critica: "danger", mayor: "warning", menor: "neutral" } as const;
const SEV_TXT = { critica: "critical", mayor: "major", menor: "minor" } as const;

function CapaCard({ capa, onOpenRun }: { capa: Capa; onOpenRun: (id: string) => void }): React.JSX.Element {
  const [abierta, setAbierta] = useState(capa.estado === "pendiente_aprobacion");
  const [aprobando, setAprobando] = useState(false);
  const [estado, setEstado] = useState<CapaEstado>(capa.estado);
  const [nota, setNota] = useState<string | null>(null);

  const hechas = capa.acciones.filter((a) => a.hecha).length;

  const aprobar = async (): Promise<void> => {
    setAprobando(true);
    setNota(null);
    try {
      const upd = await api.aprobarCapa(capa.id, "M. Ferrer");
      setEstado(upd.estado);
      setNota(DEMO_MODE ? "Plan approved by M. Ferrer (demo)." : "Plan approved by M. Ferrer.");
    } catch (e) {
      setNota(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setAprobando(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <button
          type="button"
          onClick={() => setAbierta(!abierta)}
          aria-expanded={abierta}
          className="flex w-full cursor-pointer items-start justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 rounded-lg"
        >
          <div className="min-w-0">
            <p className="font-mono text-xs text-cyan-600 dark:text-cyan-400">{capa.id}</p>
            <p className="font-display mt-0.5 text-[15px] font-bold">{capa.titulo}</p>
          </div>
          <span className="flex shrink-0 gap-1.5">
            <Badge tone={SEV_TONE[capa.severidad]}>{SEV_TXT[capa.severidad]}</Badge>
            <Badge tone={ESTADO_TONE[estado]}>{ESTADO_TXT[estado]}</Badge>
          </span>
        </button>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" aria-hidden /> {capa.responsable}
          </span>
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Due {fechaDia(capa.vencimientoIso)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onOpenRun(capa.procesoId)}>
            {capa.procesoId} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Progress value={capa.acciones.length ? (hechas / capa.acciones.length) * 100 : 0} className="flex-1" />
          <span className="text-xs text-zinc-500">{hechas}/{capa.acciones.length}</span>
        </div>

        {abierta && (
          <div className="mt-4 border-t border-zinc-200 pt-4 animate-fade-in dark:border-white/8">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{capa.descripcion}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {capa.acciones.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={
                      a.hecha
                        ? "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"
                        : "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-zinc-300 dark:border-white/20"
                    }
                    aria-hidden
                  >
                    {a.hecha && <Check className="h-3 w-3" />}
                  </span>
                  <span className={a.hecha ? "text-zinc-500 line-through" : ""}>{a.texto}</span>
                </li>
              ))}
            </ul>
            {estado === "pendiente_aprobacion" && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="success" size="sm" onClick={aprobar} disabled={aprobando}>
                  {aprobando && <Spinner />} Approve plan (human)
                </Button>
                <span className="text-xs text-zinc-500">Human approval is mandatory before execution.</span>
              </div>
            )}
            {nota && <p className="mt-3 text-[13px] font-semibold" role="status">{nota}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Capas({ onOpenRun }: { onOpenRun: (id: string) => void }): React.JSX.Element {
  const capas = useApi(api.capas);

  return (
    <div className="animate-fade-up">
      <PageHeader
        titulo="CAPA Management"
        descripcion="Corrective actions proposed by the CAPA agent, with mandatory human approval."
        acciones={<DemoBadge />}
      />
      {capas.estado === "loading" && <LoadingBlock texto="Loading CAPAs…" />}
      {capas.estado === "error" && <ErrorBlock mensaje={capas.error ?? ""} onRetry={capas.recargar} />}
      {capas.estado === "success" && capas.datos?.length === 0 && (
        <EmptyBlock titulo="No CAPAs" detalle="No corrective actions recorded." />
      )}
      {capas.estado === "success" && (
        <div className="flex flex-col gap-3">
          {capas.datos?.map((c) => <CapaCard key={c.id} capa={c} onOpenRun={onOpenRun} />)}
        </div>
      )}
    </div>
  );
}
