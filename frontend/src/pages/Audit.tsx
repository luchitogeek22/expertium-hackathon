import type * as React from "react";
import { useState } from "react";
import { Fingerprint, Link2, ShieldAlert, ShieldCheck } from "lucide-react";
import { DEMO_MODE, api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { fechaCorta } from "@/lib/format";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyBlock, ErrorBlock, LoadingBlock, Spinner } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/stat";
import { hashBadge } from "@/components/agents/flow";

export function Audit(): React.JSX.Element {
  const eventos = useApi(api.auditoria);
  const [verificando, setVerificando] = useState(false);
  const [manipulando, setManipulando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; eventos: number } | null>(null);
  const [errorVerif, setErrorVerif] = useState<string | null>(null);

  const verificar = async (): Promise<void> => {
    setVerificando(true);
    setErrorVerif(null);
    try {
      setResultado(await api.verificarCadena());
    } catch (e) {
      setResultado(null);
      setErrorVerif(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setVerificando(false);
    }
  };

  const manipular = async (): Promise<void> => {
    const aviso = DEMO_MODE
      ? "This corrupts event 1 of the demo ledger to show verification failing. Continue?"
      : "WARNING: this corrupts event 1 of the REAL ledger and the chain will stay broken until you wipe the DB and restart. Continue?";
    if (!window.confirm(aviso)) return;
    setManipulando(true);
    setErrorVerif(null);
    try {
      await api.manipularDemo();
      eventos.recargar();
      setResultado(await api.verificarCadena());
    } catch (e) {
      setResultado(null);
      setErrorVerif(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setManipulando(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        titulo="Audit Trail"
        descripcion="Append-only hash-chained ledger: each event links to the previous one (see ledger.py)."
        acciones={
          <>
            <DemoBadge />
            <Button variant="danger" onClick={manipular} disabled={manipulando || verificando}>
              {manipulando ? <Spinner /> : <ShieldAlert className="h-4 w-4" aria-hidden />}
              Simulate tampering
            </Button>
            <Button onClick={verificar} disabled={verificando || manipulando}>
              {verificando ? <Spinner /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
              Verify chain
            </Button>
          </>
        }
      />

      {(resultado || errorVerif) && (
        <div
          className={
            resultado?.ok
              ? "mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-600/8 p-4 animate-fade-in"
              : "mb-4 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-600/8 p-4 animate-fade-in"
          }
          role="status"
        >
          <Fingerprint className={resultado?.ok ? "h-6 w-6 text-emerald-500" : "h-6 w-6 text-rose-500"} aria-hidden />
          <div>
            <p className="text-sm font-bold">
              {resultado?.ok
                ? `Chain verified: ${resultado.eventos} intact events`
                : (errorVerif ?? "Chain broken: a hash does not match")}
            </p>
            <p className="text-xs text-zinc-500">
              {DEMO_MODE ? "Demo equivalent of ledger.verify_chain()." : "Result of ledger.verify_chain() on the real DB."}
            </p>
          </div>
        </div>
      )}

      {eventos.estado === "loading" && <LoadingBlock texto="Loading events…" />}
      {eventos.estado === "error" && <ErrorBlock mensaje={eventos.error ?? ""} onRetry={eventos.recargar} />}
      {eventos.estado === "success" && eventos.datos?.length === 0 && (
        <EmptyBlock titulo="No events" detalle="The ledger has no recorded activity yet." />
      )}
      {eventos.estado === "success" && (eventos.datos?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Event chain</CardTitle>
              <CardDescription>Newest first down to genesis. Hover a hash to see it in full.</CardDescription>
            </div>
            <Badge tone="neutral">{eventos.datos?.length} events</Badge>
          </CardHeader>
          <CardContent>
            <ol className="relative flex flex-col gap-0 border-l-2 border-zinc-200 pl-0 dark:border-white/10">
              {[...(eventos.datos ?? [])].reverse().map((ev) => (
                <li key={ev.id} className="relative ml-4 pb-5 last:pb-0">
                  <span className="absolute top-1 -left-4 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border border-zinc-200 bg-white dark:border-white/10 dark:bg-graphite-900" aria-hidden>
                    <Link2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  </span>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-100/60 p-3.5 dark:border-white/8 dark:bg-white/3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold">#{ev.id}</span>
                      <Badge tone="info">{ev.agente}</Badge>
                      <span className="ml-auto text-xs text-zinc-500">{fechaCorta(ev.ts)}</span>
                    </div>
                    <p className="mt-2 truncate text-[13px]" title={ev.entrada}>
                      <span className="text-zinc-500">in&nbsp;</span>{ev.entrada}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-zinc-500" title={ev.salida}>
                      <span>out&nbsp;</span>{ev.salida}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="flex items-center gap-1">prev {hashBadge(ev.hashPrevio)}</span>
                      <span aria-hidden>→</span>
                      <span className="flex items-center gap-1">hash {hashBadge(ev.hash)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
