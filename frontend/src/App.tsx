import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Shell, type PageKey } from "@/components/layout/Shell";
import { Dashboard } from "@/pages/Dashboard";
import { Workspace } from "@/pages/Workspace";
import { Expediente } from "@/pages/Expediente";
import { Knowledge } from "@/pages/Knowledge";
import { Quality } from "@/pages/Quality";
import { Capas } from "@/pages/Capas";
import { Audit } from "@/pages/Audit";
import { Analytics } from "@/pages/Analytics";
import { Settings } from "@/pages/Settings";

const PAGINAS: PageKey[] = [
  "dashboard",
  "workspace",
  "expediente",
  "knowledge",
  "quality",
  "capas",
  "audit",
  "analytics",
  "settings",
];

function paginaDesdeHash(): PageKey {
  const h = window.location.hash.replace("#", "") as PageKey;
  return PAGINAS.includes(h) ? h : "dashboard";
}

export default function App(): React.JSX.Element {
  const { theme, toggle } = useTheme();
  const [pagina, setPagina] = useState<PageKey>(paginaDesdeHash);
  const [runSel, setRunSel] = useState<string | null>(null);
  const [expedienteId, setExpedienteId] = useState<string | null>(null);
  const [knowledgeQuery, setKnowledgeQuery] = useState<string | undefined>(undefined);

  useEffect(() => {
    window.location.hash = pagina;
  }, [pagina]);

  const onNav = useCallback((p: PageKey) => setPagina(p), []);
  const onOpenRun = useCallback((id: string) => {
    setRunSel(id);
    setPagina("workspace");
  }, []);
  const onOpenExpediente = useCallback((id: string) => {
    setExpedienteId(id);
    setPagina("expediente");
  }, []);
  const onOpenDoc = useCallback((docId: string) => {
    setKnowledgeQuery(docId);
    setPagina("knowledge");
  }, []);

  return (
    <Shell pagina={pagina} onNav={onNav} theme={theme} onToggleTheme={toggle}>
      {pagina === "dashboard" && <Dashboard onOpenRun={onOpenRun} onNav={onNav} />}
      {pagina === "workspace" && <Workspace selectedId={runSel} onSelect={setRunSel} onExpediente={onOpenExpediente} />}
      {pagina === "expediente" && (
        <Expediente
          procesoId={expedienteId}
          onSelect={setExpedienteId}
          onOpenDoc={onOpenDoc}
          onBack={() => setPagina("workspace")}
        />
      )}
      {pagina === "knowledge" && <Knowledge queryInicial={knowledgeQuery} />}
      {pagina === "quality" && <Quality onOpenRun={onOpenRun} />}
      {pagina === "capas" && <Capas onOpenRun={onOpenRun} />}
      {pagina === "audit" && <Audit />}
      {pagina === "analytics" && <Analytics />}
      {pagina === "settings" && <Settings theme={theme} onToggleTheme={toggle} />}
    </Shell>
  );
}
