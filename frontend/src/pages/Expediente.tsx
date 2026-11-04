import type * as React from "react";
import { ArrowLeft, Check, Download } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { fechaCorta, fechaDia, hace, miles, msCorto } from "@/lib/format";
import type { AgentRun } from "@/lib/types";
import {
  descargarExpediente,
  expedienteMarkdown,
  type ExpedienteDatos,
} from "@/lib/expediente";
import { AGENTE_META, RunCard, StatusBadge, hashBadge } from "@/components/agents/flow";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/stat";

function campo(salida: Record<string, unknown> | null, clave: string): string {
  const v = salida?.[clave];
  if (typeof v === "string" && v.trim()) return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "—";
}

function listaDocs(salida: Record<string, unknown> | null): string[] {
  const v = salida?.["documentos"];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function Etiqueta({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="mb-1 text-[11px] font-bold tracking-widest text-zinc-500 uppercase">{children}</p>
  );
}

function Detalle({
  id,
  onOpenDoc,
  onBack,
}: {
  id: string;
  onOpenDoc: (docId: string) => void;
  onBack: () => void;
}): React.JSX.Element {
  const run = useApi(() => api.proceso(id), [id]);
  const controles = useApi(api.controles);
  const capas = useApi(api.capas);
  const eventos = useApi(api.auditoria);
  const agentes = useApi(api.agentes);
  const docs = useApi(api.documentos);
  const todo = [run, controles, capas, eventos, agentes, docs];

  if (todo.some((r) => r.estado === "loading")) {
    return (
      <div className="animate-fade-up">
        <PageHeader titulo={`Case file ${id}`} descripcion="Full process dossier." />
        <LoadingBlock texto="Loading case file…" />
      </div>
    );
  }
  if (todo.some((r) => r.estado === "error")) {
    return (
      <div className="animate-fade-up">
        <PageHeader
          titulo={`Case file ${id}`}
          descripcion="Full process dossier."
          acciones={
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Button>
          }
        />
        <ErrorBlock
          mensaje={todo.find((r) => r.error)?.error ?? "Unknown error"}
          onRetry={() => todo.forEach((r) => r.recargar())}
        />
      </div>
    );
  }

  const r: AgentRun | null = run.datos;
  if (!r) {
    return (
      <div className="animate-fade-up">
        <PageHeader titulo={`Case file ${id}`} descripcion="Full process dossier." />
        <EmptyBlock titulo="Process not found" detalle={`${id} is not in the current list.`} />
      </div>
    );
  }

  const k = r.pasos.find((p) => p.agente === "knowledge") ?? null;
  const q = r.pasos.find((p) => p.agente === "quality") ?? null;
  const abstencion = k?.salida?.["abstencion"] === true;
  const motivoAbst =
    typeof k?.salida?.["motivo_abstencion"] === "string" ? k.salida["motivo_abstencion"] : "";
  const citas = listaDocs(k?.salida ?? null);
  const check = (controles.datos ?? []).find((c) => c.procesoId === id) ?? null;
  const capa = (capas.datos ?? []).find((c) => c.procesoId === id) ?? null;
  const evs = (eventos.datos ?? []).filter((e) => e.entrada === id);
  const modelos: Record<string, string> = Object.fromEntries(
    (agentes.datos ?? []).map((a) => [a.id, a.modelo]),
  );
  const base = docs.datos ?? [];
  const tokensTotal = r.pasos.reduce((a, p) => a + (p.tokens?.total ?? 0), 0);

  const datos: ExpedienteDatos = { run: r, check, capa, eventos: evs, modelos, docs: base };
  const exportar = (): void => descargarExpediente(r.id, expedienteMarkdown(datos));

  return (
    <div className="animate-fade-up">
      <PageHeader
        titulo={`Case file ${r.id}`}
        descripcion={r.titulo}
        acciones={
          <>
            <DemoBadge />
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Button>
            <Button onClick={exportar}>
              <Download className="h-4 w-4" aria-hidden /> Export Markdown
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Non-conformity</CardTitle>
              <CardDescription>
                Created {hace(r.creadoIso)} · Updated {fechaCorta(r.actualizadoIso)}
              </CardDescription>
            </div>
            <StatusBadge estado={r.estado} />
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{r.descripcion}</p>
            <p className="mt-3 text-sm">
              <span className="text-zinc-500">Approver: </span>
              <strong>{r.aprobadoPor ?? "pending"}</strong>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Knowledge and sources</CardTitle>
              <CardDescription>Likely cause and cited documents (click to open).</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {abstencion && (
              <p className="mb-3 rounded-lg bg-amber-500/10 p-3 text-[13px] font-semibold text-amber-700 ring-1 ring-amber-500/25 ring-inset dark:text-amber-300" role="status">
                Knowledge abstained: no source in the documents.{motivoAbst ? ` ${motivoAbst}` : ""}
              </p>
            )}
            <Etiqueta>Likely cause</Etiqueta>
            <p className="text-sm font-semibold">{campo(k?.salida ?? null, "causa_probable")}</p>
            <div className="mt-3">
              <Etiqueta>Cited sources</Etiqueta>
              {citas.length === 0 && <p className="text-sm text-zinc-500">No citations.</p>}
              <ul className="flex flex-col gap-1.5">
                {citas.map((c) => {
                  const doc = base.find((x) => x.id === c);
                  return (
                    <li key={c}>
                      <button
                        type="button"
                        onClick={() => onOpenDoc(c)}
                        className="cursor-pointer font-mono text-[13px] text-cyan-600 underline decoration-dotted underline-offset-4 outline-none hover:text-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400/70 dark:text-cyan-400"
                        title={doc ? doc.titulo : "Not found in the base"}
                      >
                        {c}
                      </button>
                      <span className="ml-2 text-xs text-zinc-500">
                        {doc ? doc.titulo : "· not found in base"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Quality analysis</CardTitle>
              <CardDescription>Quality agent ruling and linked check.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-white/4">
                <dt className="text-[11px] text-zinc-500">Outcome</dt>
                <dd className="font-bold">{campo(q?.salida ?? null, "resultado")}</dd>
              </div>
              <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-white/4">
                <dt className="text-[11px] text-zinc-500">Risk</dt>
                <dd className="font-bold">{campo(q?.salida ?? null, "riesgo")}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {campo(q?.salida ?? null, "justificacion")}
            </p>
            {check && (
              <p className="mt-2 text-xs text-zinc-500">
                Check {check.id} · batch {check.lote} · {check.inspector} · {fechaDia(check.fechaIso)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>CAPA</CardTitle>
              <CardDescription>Corrective action, owner and due date.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!capa && (
              <p className="text-sm text-zinc-500">
                No CAPA: Quality did not require one or the flow has not reached CAPA.
              </p>
            )}
            {capa && (
              <>
                <p className="text-sm font-bold">{capa.titulo}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {capa.id} · {capa.estado} · {capa.severidad} · {capa.responsable} · due {fechaDia(capa.vencimientoIso)}
                </p>
                <ul className="mt-3 flex flex-col gap-1.5">
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
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Traceability and hashes</CardTitle>
              <CardDescription>Ledger events for this process.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {evs.length === 0 && <p className="text-sm text-zinc-500">No recorded events.</p>}
            <ul className="flex flex-col gap-2">
              {evs.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-mono font-bold">#{e.id}</span>
                  <span className="text-zinc-500">{e.agente} · {fechaCorta(e.ts)}</span>
                  <span className="flex items-center gap-1">
                    {hashBadge(e.hashPrevio)} <span aria-hidden>→</span> {hashBadge(e.hash)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Model and tokens</CardTitle>
              <CardDescription>Real usage per agent step.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {r.pasos.map((p) => (
                <li key={p.agente} className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{AGENTE_META[p.agente].nombre}</span>
                  <span className="font-mono text-[13px] text-zinc-500">
                    {modelos[p.agente] ?? "—"} · {p.tokens ? `${miles(p.tokens.total)} tok` : "—"} · {msCorto(p.latenciaMs)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-zinc-200 pt-3 text-sm font-bold dark:border-white/8">
              Total: {miles(tokensTotal)} tokens
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function Expediente({
  procesoId,
  onSelect,
  onOpenDoc,
  onBack,
}: {
  procesoId: string | null;
  onSelect: (id: string) => void;
  onOpenDoc: (docId: string) => void;
  onBack: () => void;
}): React.JSX.Element {
  const runs = useApi(api.procesos);

  if (!procesoId) {
    return (
      <div className="animate-fade-up">
        <PageHeader
          titulo="Case file"
          descripcion="Select a process to see its full dossier."
          acciones={<DemoBadge />}
        />
        {runs.estado === "loading" && <LoadingBlock texto="Loading processes…" />}
        {runs.estado === "error" && <ErrorBlock mensaje={runs.error ?? ""} onRetry={runs.recargar} />}
        {runs.estado === "success" && (
          <div className="grid gap-3 md:grid-cols-2">
            {(runs.datos ?? []).map((r) => (
              <RunCard key={r.id} run={r} onOpen={() => onSelect(r.id)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <Detalle id={procesoId} onOpenDoc={onOpenDoc} onBack={onBack} />;
}
