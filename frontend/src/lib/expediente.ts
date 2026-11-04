/**
 * EXPEDIENTE — dossier por proceso y exportación Markdown.
 *
 * Funciones puras sobre los tipos del contrato; sin acceso a red ni DOM
 * (salvo descargarExpediente, que dispara la descarga en el navegador).
 */
import type {
  AgentRun,
  AuditEvent,
  Capa,
  CapaEstado,
  KnowledgeDoc,
  QualityCheck,
  RunStatus,
} from "@/lib/types";

export interface ExpedienteDatos {
  run: AgentRun;
  check: QualityCheck | null;
  capa: Capa | null;
  eventos: AuditEvent[];
  modelos: Record<string, string>;
  docs: KnowledgeDoc[];
}

const ESTADO_RUN: Record<RunStatus, string> = {
  pending: "Pending",
  running: "Running",
  success: "Success",
  error: "Error",
  waiting_approval: "Pending approval",
};

const ESTADO_CAPA: Record<CapaEstado, string> = {
  borrador: "Draft",
  en_curso: "In progress",
  pendiente_aprobacion: "Pending approval",
  aprobada: "Approved",
  cerrada: "Closed",
  rechazada: "Rejected",
};

function txt(v: unknown): string {
  if (typeof v === "string" && v.trim()) return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "—";
}

function listaStr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Genera el dossier completo del proceso en Markdown. */
export function expedienteMarkdown(d: ExpedienteDatos): string {
  const { run } = d;
  const paso = (ag: string) => run.pasos.find((p) => p.agente === ag) ?? null;
  const k = paso("knowledge");
  const q = paso("quality");
  const citas = listaStr(k?.salida?.["documentos"]);
  const tituloDoc = (id: string): string =>
    d.docs.find((x) => x.id === id)?.titulo ?? "(not found in base)";
  const tokensTotal = run.pasos.reduce((a, p) => a + (p.tokens?.total ?? 0), 0);

  const L: string[] = [];
  L.push(`# Case file ${run.id}`, "");
  L.push(`**${run.titulo}**`, "");
  L.push(`- Status: ${ESTADO_RUN[run.estado]}`);
  L.push(`- Created: ${run.creadoIso} · Updated: ${run.actualizadoIso}`);
  L.push(`- Approved by: ${run.aprobadoPor ?? "pending"}`);
  L.push("", "## Non-conformity", "", run.descripcion, "");
  L.push("## Knowledge", "");
  L.push(`- Likely cause: ${txt(k?.salida?.["causa_probable"])}`);
  if (k?.salida?.["abstencion"] === true) {
    const motivo = txt(k.salida["motivo_abstencion"]);
    L.push(`- Knowledge ABSTENTION: no source in the documents${motivo === "—" ? "" : `. ${motivo}`}`);
  }
  const resumen = txt(k?.salida?.["resumen"]);
  if (resumen !== "—") L.push(`- Summary: ${resumen}`);
  L.push("- Cited sources:");
  if (citas.length === 0) L.push("  - (no citations)");
  for (const c of citas) L.push(`  - ${c} — ${tituloDoc(c)}`);
  L.push("", "## Quality", "");
  L.push(`- Outcome: ${txt(q?.salida?.["resultado"])}`);
  L.push(`- Risk: ${txt(q?.salida?.["riesgo"])}`);
  L.push(`- Requires CAPA: ${txt(q?.salida?.["requiere_capa"])}`);
  L.push(`- Justification: ${txt(q?.salida?.["justificacion"])}`);
  if (d.check) {
    L.push(`- Check ${d.check.id} (batch ${d.check.lote}): ${d.check.resultado}, risk ${d.check.riesgo}`);
    L.push(`- Inspector: ${d.check.inspector} · ${d.check.fechaIso}`);
    L.push(`- Detail: ${d.check.detalle}`);
  } else {
    L.push("- Check: (no record)");
  }
  L.push("", "## CAPA", "");
  if (d.capa) {
    L.push(`- ${d.capa.id}: ${d.capa.titulo} (${ESTADO_CAPA[d.capa.estado]}, ${d.capa.severidad})`);
    L.push(`- Owner: ${d.capa.responsable} · Due: ${d.capa.vencimientoIso}`);
    L.push(`- Description: ${d.capa.descripcion}`);
    L.push("- Actions:");
    for (const a of d.capa.acciones) L.push(`  - [${a.hecha ? "x" : " "}] ${a.texto}`);
  } else {
    L.push("(no CAPA: Quality did not require one or the flow has not reached CAPA)");
  }
  L.push("", "## Traceability (hashes)", "");
  if (d.eventos.length === 0) {
    L.push("(no recorded events)");
  }
  for (const e of d.eventos) {
    L.push(`- #${e.id} ${e.ts} [${e.agente}] ${e.hashPrevio} → ${e.hash}`);
  }
  L.push("", "## Model and tokens", "");
  L.push("| Agent | Model | Tokens | Latency ms |");
  L.push("|---|---|---|---|");
  for (const p of run.pasos) {
    L.push(`| ${p.agente} | ${d.modelos[p.agente] ?? "—"} | ${p.tokens?.total ?? "—"} | ${p.latenciaMs ?? "—"} |`);
  }
  L.push(`| **Total** | | **${tokensTotal}** | |`);
  L.push("", `_Exported on ${new Date().toISOString()}_`, "");
  return L.join("\n");
}

/** Descarga el contenido como `case-{id}.md` en el navegador. */
export function descargarExpediente(runId: string, contenido: string): void {
  const blob = new Blob([contenido], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `case-${runId}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
