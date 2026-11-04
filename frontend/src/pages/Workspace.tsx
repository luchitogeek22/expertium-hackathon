import type * as React from "react";
import { useState } from "react";
import { CheckCircle2, FileText, Play, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { hace } from "@/lib/format";
import type { AgentId, AgentRun, NewRunInput } from "@/lib/types";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyBlock, ErrorBlock, LoadingBlock, Spinner } from "@/components/ui/feedback";
import { FieldLabel, Input, Textarea } from "@/components/ui/forms";
import { PageHeader } from "@/components/ui/stat";
import { PipelineFlow, RunCard, StatusBadge, StepDetail } from "@/components/agents/flow";

/** Modal para crear un proceso (introducir solicitud). */
function NewRunModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (run: AgentRun) => void;
}): React.JSX.Element {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (): Promise<void> => {
    if (titulo.trim().length < 3 || descripcion.trim().length < 10) {
      setError("The title needs at least 3 characters and the description 10 (required by the backend).");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const input: NewRunInput = { titulo: titulo.trim(), descripcion: descripcion.trim() };
      const run = await api.crearProceso(input);
      onCreated(run);
      setTitulo("");
      setDescripcion("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} titulo="New process" descripcion="The request will queue up for the Knowledge agent.">
      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel htmlFor="nr-titulo">Non-conformity title</FieldLabel>
          <Input
            id="nr-titulo"
            placeholder="e.g. Pressure drift on line 2"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="nr-desc">Description</FieldLabel>
          <Textarea
            id="nr-desc"
            placeholder="Describe what was observed, where and when…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-lg bg-rose-600/10 p-3 text-[13px] font-semibold text-rose-600 ring-1 ring-rose-500/25 ring-inset dark:text-rose-300" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={enviando}>
            Cancel
          </Button>
          <Button onClick={enviar} disabled={enviando}>
            {enviando && <Spinner />}
            Create process
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function Workspace({
  selectedId,
  onSelect,
  onExpediente,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onExpediente: (id: string) => void;
}): React.JSX.Element {
  const runs = useApi(api.procesos);
  const [modal, setModal] = useState(false);
  const [creados, setCreados] = useState<AgentRun[]>([]);
  const [actualizados, setActualizados] = useState<Record<string, AgentRun>>({});
  const [pasoSel, setPasoSel] = useState<AgentId | null>(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [errorRun, setErrorRun] = useState<string | null>(null);

  const todos = [...creados, ...(runs.datos ?? [])].map((r) => actualizados[r.id] ?? r);
  const sel = selectedId ? (todos.find((r) => r.id === selectedId) ?? null) : (todos[0] ?? null);
  const seleccionPerdida =
    selectedId !== null && runs.estado === "success" && !todos.some((r) => r.id === selectedId);
  const paso = sel?.pasos.find((p) => p.agente === pasoSel) ?? null;

  const ejecutar = async (): Promise<void> => {
    if (!sel || ejecutando) return;
    setEjecutando(true);
    setErrorRun(null);
    try {
      const res = await api.ejecutarProceso(sel.id);
      setActualizados((a) => ({ ...a, [sel.id]: res }));
      setPasoSel(null);
    } catch (e) {
      setErrorRun(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        titulo="Agent Workspace"
        descripcion="Create processes, follow the flow across the four agents and inspect inputs, outputs and evidence."
        acciones={
          <>
            <DemoBadge />
            <Button onClick={() => setModal(true)}>
              <Plus className="h-4 w-4" aria-hidden /> New process
            </Button>
          </>
        }
      />

      {runs.estado === "loading" && <LoadingBlock texto="Loading processes…" />}
      {runs.estado === "error" && <ErrorBlock mensaje={runs.error ?? ""} onRetry={runs.recargar} />}
      {runs.estado === "success" && (
        <div className="grid gap-4 xl:grid-cols-3">
          {/* Lista */}
          <div className="flex flex-col gap-3">
            {todos.length === 0 && <EmptyBlock titulo="No processes" detalle="Create the first one with “New process”." />}
            {todos.map((r) => (
              <RunCard key={r.id} run={r} onOpen={() => { onSelect(r.id); setPasoSel(null); }} />
            ))}
          </div>

          {/* Detalle */}
          <div className="xl:col-span-2">
            {seleccionPerdida && (
              <Card>
                <CardContent>
                  <p className="text-sm font-semibold">Process {selectedId} not found in the current list.</p>
                  <p className="mt-1 mb-3 text-sm text-zinc-500">It may have been created in another session or the list does not include it yet.</p>
                  <Button variant="secondary" onClick={() => onSelect(null)}>
                    Back to the list
                  </Button>
                </CardContent>
              </Card>
            )}
            {!sel && !seleccionPerdida && <EmptyBlock titulo="Nothing selected" detalle="Pick a process from the list." />}
            {sel && (
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader>
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-cyan-600 dark:text-cyan-400">{sel.id}</p>
                      <CardTitle>{sel.titulo}</CardTitle>
                      <CardDescription>
                        Updated {hace(sel.actualizadoIso)}
                        {sel.aprobadoPor ? ` · Approved by ${sel.aprobadoPor}` : ""}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onExpediente(sel.id)}>
                        <FileText className="h-3.5 w-3.5" aria-hidden /> Case file
                      </Button>
                      <StatusBadge estado={sel.estado} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{sel.descripcion}</p>
                    {(sel.estado === "pending" || sel.estado === "error") && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button onClick={ejecutar} disabled={ejecutando}>
                          {ejecutando ? <Spinner /> : <Play className="h-4 w-4" aria-hidden />}
                          {ejecutando ? "Running pipeline…" : "Run pipeline"}
                        </Button>
                        <span className="text-xs text-zinc-500">
                          Knowledge → Quality → CAPA → Audit. May take 1–2 min.
                        </span>
                      </div>
                    )}
                    {errorRun && (
                      <p className="mt-3 rounded-lg bg-rose-600/10 p-3 text-[13px] font-semibold text-rose-600 ring-1 ring-rose-500/25 ring-inset dark:text-rose-300" role="alert">
                        {errorRun}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {sel.pasos.length === 0 ? (
                  <Card>
                    <CardContent>
                      <p className="flex items-center gap-2 text-sm text-zinc-500">
                        <CheckCircle2 className="h-4 w-4 text-cyan-500" aria-hidden />
                        Queued process: the Knowledge agent will pick it up when capacity frees.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <PipelineFlow pasos={sel.pasos} seleccionado={pasoSel} onSelect={setPasoSel} />
                    {paso ? (
                      <StepDetail paso={paso} />
                    ) : (
                      <Card>
                        <CardContent>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Select a flow agent to see its input, JSON output, timings and evidence.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <NewRunModal
        open={modal}
        onClose={() => setModal(false)}
        onCreated={(r) => {
          setCreados((c) => [r, ...c]);
          onSelect(r.id);
        }}
      />
    </div>
  );
}
