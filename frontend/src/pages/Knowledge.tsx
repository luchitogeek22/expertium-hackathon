import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FileText, Search, Upload } from "lucide-react";
import { DEMO_MODE, api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { fechaCorta } from "@/lib/format";
import type { KnowledgeDoc } from "@/lib/types";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyBlock, ErrorBlock, LoadingBlock, Spinner } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/stat";
import { TD, TH, THead, TRow, Table } from "@/components/ui/table";

export function Knowledge({ queryInicial }: { queryInicial?: string }): React.JSX.Element {
  const docs = useApi(api.documentos);
  const [q, setQ] = useState(queryInicial ?? "");

  useEffect(() => {
    if (queryInicial !== undefined) setQ(queryInicial);
  }, [queryInicial]);
  const [subidos, setSubidos] = useState<KnowledgeDoc[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const todosDocs = [...subidos, ...(docs.datos ?? [])];
  const filtrados = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return todosDocs;
    return todosDocs.filter(
      (d) =>
        d.titulo.toLowerCase().includes(query) ||
        d.id.toLowerCase().includes(query) ||
        d.categoria.toLowerCase().includes(query),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, subidos, docs.datos]);

  const subir = async (file: File | undefined): Promise<void> => {
    if (!file || subiendo) return;
    setSubiendo(true);
    setErrorSubida(null);
    try {
      const doc = await api.subirDocumento(file);
      if (DEMO_MODE) setSubidos((s) => [doc, ...s]);
      else docs.recargar();
    } catch (e) {
      setErrorSubida(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        titulo="Knowledge Center"
        descripcion="Document base the Knowledge agent consults to propose likely causes."
        acciones={
          <>
            <DemoBadge />
            <Button
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              title="Upload a document to the knowledge base"
            >
              {subiendo ? <Spinner /> : <Upload className="h-4 w-4" aria-hidden />}
              {subiendo ? "Uploading…" : "Upload document"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.csv,.json,.log,.text"
              className="hidden"
              aria-label="Choose document"
              onChange={(e) => void subir(e.target.files?.[0])}
            />
          </>
        }
      />

      {errorSubida && (
        <p className="mb-4 rounded-lg bg-rose-600/10 p-3 text-[13px] font-semibold text-rose-600 ring-1 ring-rose-500/25 ring-inset dark:text-rose-300" role="alert">
          {errorSubida}
        </p>
      )}

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, id or category…"
          aria-label="Search documents"
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 dark:border-white/10 dark:bg-graphite-850 dark:placeholder:text-zinc-500"
        />
      </div>

      {docs.estado === "loading" && <LoadingBlock texto="Loading documents…" />}
      {docs.estado === "error" && <ErrorBlock mensaje={docs.error ?? ""} onRetry={docs.recargar} />}
      {docs.estado === "success" && filtrados.length === 0 && (
        <EmptyBlock titulo="No results" detalle="No document matches the search." />
      )}
      {docs.estado === "success" && filtrados.length > 0 && (
        <>
          <Table>
            <THead>
              <TRow>
                <TH>ID</TH>
                <TH>Title</TH>
                <TH className="hidden md:table-cell">Source</TH>
                <TH>Category</TH>
                <TH className="hidden text-right sm:table-cell">Fragments</TH>
                <TH className="hidden lg:table-cell">Updated</TH>
              </TRow>
            </THead>
            <tbody>
              {filtrados.map((d) => (
                <TRow key={d.id}>
                  <TD className="font-mono text-cyan-600 dark:text-cyan-400">{d.id}</TD>
                  <TD className="font-semibold">
                    {d.titulo}
                    {d.demo && (
                      <span className="mt-1 block">
                        <Badge tone="neutral">demo data</Badge>
                      </span>
                    )}
                  </TD>
                  <TD className="hidden text-zinc-500 md:table-cell">{d.fuente}</TD>
                  <TD>
                    <Badge tone="info">{d.categoria}</Badge>
                  </TD>
                  <TD className="hidden text-right sm:table-cell">{d.fragmentos}</TD>
                  <TD className="hidden text-zinc-500 lg:table-cell">{fechaCorta(d.actualizadoIso)}</TD>
                </TRow>
              ))}
            </tbody>
          </Table>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-600/12 p-2 text-blue-500 dark:text-blue-400">
                  <BookOpen className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-xl font-bold">{todosDocs.length}</p>
                  <p className="text-xs text-zinc-500">Indexed documents</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <span className="rounded-lg bg-cyan-500/12 p-2 text-cyan-600 dark:text-cyan-400">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-xl font-bold">
                    {todosDocs.reduce((a, d) => a + d.fragmentos, 0)}
                  </p>
                  <p className="text-xs text-zinc-500">Retrievable fragments</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <span className="rounded-lg bg-emerald-600/12 p-2 text-emerald-600 dark:text-emerald-400">
                  <Search className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-xl font-bold">{filtrados.length}</p>
                  <p className="text-xs text-zinc-500">Match the filter</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
