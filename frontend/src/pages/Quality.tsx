import type * as React from "react";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { fechaDia } from "@/lib/format";
import type { QualityCheck } from "@/lib/types";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { TD, TH, THead, TRow, Table } from "@/components/ui/table";

const RESULTADO_TONE = { apto: "success", no_apto: "danger", en_revision: "warning" } as const;
const RESULTADO_TXT = { apto: "Pass", no_apto: "Fail", en_revision: "In review" } as const;
const RIESGO_TONE = { bajo: "success", medio: "warning", alto: "danger" } as const;
const RIESGO_TXT = { bajo: "Low", medio: "Medium", alto: "High" } as const;

export function Quality({ onOpenRun }: { onOpenRun: (id: string) => void }): React.JSX.Element {
  const checks = useApi(api.controles);
  const [filtro, setFiltro] = useState("todos");

  const lista: QualityCheck[] = useMemo(() => {
    const datos = checks.datos ?? [];
    if (filtro === "todos") return datos;
    return datos.filter((c) => c.resultado === filtro);
  }, [filtro, checks.datos]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        titulo="Quality Control"
        descripcion="Inspections rated by the Quality agent: outcome, risk and process traceability."
        acciones={<DemoBadge />}
      />

      <div className="mb-4">
        <Tabs
          tabs={[
            { id: "todos", etiqueta: "All" },
            { id: "en_revision", etiqueta: "In review" },
            { id: "apto", etiqueta: "Passed" },
            { id: "no_apto", etiqueta: "Failed" },
          ]}
          activo={filtro}
          onChange={setFiltro}
        />
      </div>

      {checks.estado === "loading" && <LoadingBlock texto="Loading inspections…" />}
      {checks.estado === "error" && <ErrorBlock mensaje={checks.error ?? ""} onRetry={checks.recargar} />}
      {checks.estado === "success" && lista.length === 0 && (
        <EmptyBlock titulo="No inspections" detalle="No check matches the current filter." />
      )}
      {checks.estado === "success" && lista.length > 0 && (
        <Table>
          <THead>
            <TRow>
              <TH>ID</TH>
              <TH>Batch</TH>
              <TH>Outcome</TH>
              <TH>Risk</TH>
              <TH className="hidden md:table-cell">Detail</TH>
              <TH className="hidden lg:table-cell">Inspector</TH>
              <TH className="hidden sm:table-cell">Date</TH>
              <TH><span className="sr-only">Open process</span></TH>
            </TRow>
          </THead>
          <tbody>
            {lista.map((c) => (
              <TRow key={c.id}>
                <TD className="font-mono whitespace-nowrap text-cyan-600 dark:text-cyan-400">{c.id}</TD>
                <TD className="font-semibold">{c.lote}</TD>
                <TD>
                  <Badge tone={RESULTADO_TONE[c.resultado]}>{RESULTADO_TXT[c.resultado]}</Badge>
                </TD>
                <TD>
                  <Badge tone={RIESGO_TONE[c.riesgo]}>{RIESGO_TXT[c.riesgo]}</Badge>
                </TD>
                <TD className="hidden max-w-64 truncate text-zinc-500 md:table-cell" title={c.detalle}>
                  {c.detalle}
                </TD>
                <TD className="hidden lg:table-cell">{c.inspector}</TD>
                <TD className="hidden whitespace-nowrap text-zinc-500 sm:table-cell">{fechaDia(c.fechaIso)}</TD>
                <TD className="text-right">
                  {c.procesoId !== "—" && (
                    <Button variant="ghost" size="sm" onClick={() => onOpenRun(c.procesoId)} title={`Open ${c.procesoId}`}>
                      {c.procesoId} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                </TD>
              </TRow>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
