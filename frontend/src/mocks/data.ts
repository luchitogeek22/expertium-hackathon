/**
 * DATOS DEMO — claramente identificados con `demo: true`.
 * Sustituir por llamadas reales cuando exista el backend FastAPI.
 */
import type {
  ActivityItem,
  AgentInfo,
  AgentRun,
  AnalyticsSummary,
  AuditEvent,
  Capa,
  DashboardKpis,
  KnowledgeDoc,
  QualityCheck,
} from "@/lib/types";

const HACE_MS = 60_000;
const ahora = Date.now();
const iso = (minutosAtras: number): string =>
  new Date(ahora - minutosAtras * HACE_MS).toISOString();

export const DEMO_AGENTS: AgentInfo[] = [
  {
    id: "knowledge",
    nombre: "Knowledge",
    descripcion: "Retrieves context and a likely cause from the document base.",
    icono: "Brain",
    color: "text-cyan-400",
    modelo: "muse-spark-1.3",
    esfuerzo: "low",
    timeoutSeg: 60,
    activo: true,
  },
  {
    id: "quality",
    nombre: "Quality",
    descripcion: "Assesses risk and decides whether the case needs a CAPA.",
    icono: "ShieldCheck",
    color: "text-blue-400",
    modelo: "muse-spark-1.3",
    esfuerzo: "low",
    timeoutSeg: 60,
    activo: true,
  },
  {
    id: "capa",
    nombre: "CAPA",
    descripcion: "Proposes corrective actions with owner and due date.",
    icono: "Wrench",
    color: "text-amber-400",
    modelo: "muse-spark-1.3",
    esfuerzo: "medium",
    timeoutSeg: 90,
    activo: true,
  },
  {
    id: "audit",
    nombre: "Audit",
    descripcion: "Records every step in the hash-chained ledger.",
    icono: "Fingerprint",
    color: "text-emerald-400",
    modelo: "muse-spark-1.3",
    esfuerzo: "minimal",
    timeoutSeg: 30,
    activo: true,
  },
];

export const DEMO_RUNS: AgentRun[] = [
  {
    id: "NC-2026-1042",
    titulo: "Temperature drift on line 3",
    descripcion:
      "Sensor T-31 reads +4.2 °C above setpoint during the night shift across three consecutive batches.",
    estado: "waiting_approval",
    actual: null,
    creadoIso: iso(190),
    actualizadoIso: iso(12),
    aprobadoPor: null,
    demo: true,
    pasos: [
      {
        agente: "knowledge",
        estado: "success",
        entrada: "Temperature drift on line 3, sensor T-31",
        salida: { causa_probable: "Calibration drift on sensor T-31", documentos: ["MAN-012", "PROC-034"] },
        inicioIso: iso(185),
        finIso: iso(183),
        latenciaMs: 1840,
        tokens: { prompt: 812, completion: 214, total: 1026, razonamiento: 96 },
        error: null,
        evidencias: [
          { id: "ev1", titulo: "MAN-012 — Sensor calibration", tipo: "documento", referencia: "MAN-012" },
          { id: "ev2", titulo: "T-31 series, last 7 days", tipo: "metrica", referencia: "TS-T31" },
        ],
      },
      {
        agente: "quality",
        estado: "success",
        entrada: "Likely cause: calibration drift on sensor T-31",
        salida: { riesgo: "medio", requiere_capa: true, justificacion: "Repeated trend across 3 batches" },
        inicioIso: iso(182),
        finIso: iso(180),
        latenciaMs: 2210,
        tokens: { prompt: 640, completion: 188, total: 828, razonamiento: 74 },
        error: null,
        evidencias: [{ id: "ev3", titulo: "Rule Q-07 applied", tipo: "metrica", referencia: "Q-07" }],
      },
      {
        agente: "capa",
        estado: "waiting_approval",
        entrada: "Medium risk, CAPA required",
        salida: {
          acciones: ["Recalibrate sensor T-31", "Retrain shift B", "Add weekly verification"],
          responsable: "J. Ruiz",
          plazo_dias: 14,
        },
        inicioIso: iso(179),
        finIso: iso(176),
        latenciaMs: 3420,
        tokens: { prompt: 905, completion: 342, total: 1247, razonamiento: 210 },
        error: null,
        evidencias: [],
      },
      {
        agente: "audit",
        estado: "pending",
        entrada: "",
        salida: null,
        inicioIso: null,
        finIso: null,
        latenciaMs: null,
        tokens: null,
        error: null,
        evidencias: [],
      },
    ],
  },
  {
    id: "NC-2026-1041",
    titulo: "Mislabeling on batch B-88",
    descripcion: "40 units found with the wrong variant label after a format change.",
    estado: "running",
    actual: "quality",
    creadoIso: iso(65),
    actualizadoIso: iso(3),
    aprobadoPor: null,
    demo: true,
    pasos: [
      {
        agente: "knowledge",
        estado: "success",
        entrada: "Mislabeling on batch B-88",
        salida: { causa_probable: "Label reel not verified after format change", documentos: ["PROC-101"] },
        inicioIso: iso(60),
        finIso: iso(58),
        latenciaMs: 1620,
        tokens: { prompt: 701, completion: 176, total: 877, razonamiento: 61 },
        error: null,
        evidencias: [{ id: "ev4", titulo: "PROC-101 — Format change", tipo: "documento", referencia: "PROC-101" }],
      },
      {
        agente: "quality",
        estado: "running",
        entrada: "Label reel not verified after format change",
        salida: null,
        inicioIso: iso(4),
        finIso: null,
        latenciaMs: null,
        tokens: null,
        error: null,
        evidencias: [],
      },
      {
        agente: "capa",
        estado: "pending",
        entrada: "",
        salida: null,
        inicioIso: null,
        finIso: null,
        latenciaMs: null,
        tokens: null,
        error: null,
        evidencias: [],
      },
      {
        agente: "audit",
        estado: "pending",
        entrada: "",
        salida: null,
        inicioIso: null,
        finIso: null,
        latenciaMs: null,
        tokens: null,
        error: null,
        evidencias: [],
      },
    ],
  },
  {
    id: "NC-2026-1040",
    titulo: "Particles in mixing tank M-2",
    descripcion: "Visual inspection finds particles after scheduled maintenance on tank M-2.",
    estado: "success",
    actual: null,
    creadoIso: iso(1440),
    actualizadoIso: iso(1300),
    aprobadoPor: "M. Ferrer",
    demo: true,
    pasos: [
      {
        agente: "knowledge",
        estado: "success",
        entrada: "Particles in mixing tank M-2",
        salida: { causa_probable: "Debris from a gasket replaced during maintenance", documentos: ["MAN-044"] },
        inicioIso: iso(1430),
        finIso: iso(1428),
        latenciaMs: 1980,
        tokens: { prompt: 770, completion: 201, total: 971, razonamiento: 88 },
        error: null,
        evidencias: [],
      },
      {
        agente: "quality",
        estado: "success",
        entrada: "Debris from a gasket replaced during maintenance",
        salida: { riesgo: "alto", requiere_capa: true, justificacion: "Direct product contact" },
        inicioIso: iso(1427),
        finIso: iso(1425),
        latenciaMs: 2340,
        tokens: { prompt: 690, completion: 205, total: 895, razonamiento: 92 },
        error: null,
        evidencias: [],
      },
      {
        agente: "capa",
        estado: "success",
        entrada: "High risk, CAPA required",
        salida: { acciones: ["Validated CIP cleaning", "Inspect remaining gaskets"], responsable: "A. Soler", plazo_dias: 7 },
        inicioIso: iso(1424),
        finIso: iso(1421),
        latenciaMs: 3110,
        tokens: { prompt: 840, completion: 298, total: 1138, razonamiento: 175 },
        error: null,
        evidencias: [{ id: "ev5", titulo: "Approval by M. Ferrer", tipo: "aprobacion", referencia: "APR-2201" }],
      },
      {
        agente: "audit",
        estado: "success",
        entrada: "Case file NC-2026-1040 complete",
        salida: { eventos: 4, cadena: "OK" },
        inicioIso: iso(1310),
        finIso: iso(1300),
        latenciaMs: 640,
        tokens: { prompt: 210, completion: 48, total: 258 },
        error: null,
        evidencias: [{ id: "ev6", titulo: "Audit block #881", tipo: "hash", referencia: "#881" }],
      },
    ],
  },
  {
    id: "NC-2026-1039",
    titulo: "Abnormal noise on compressor C-1",
    descripcion: "The operator reports vibration and noise on compressor C-1 during startup.",
    estado: "error",
    actual: null,
    creadoIso: iso(2880),
    actualizadoIso: iso(2800),
    aprobadoPor: null,
    demo: true,
    pasos: [
      {
        agente: "knowledge",
        estado: "error",
        entrada: "Abnormal noise on compressor C-1",
        salida: null,
        inicioIso: iso(2870),
        finIso: iso(2869),
        latenciaMs: 60120,
        tokens: null,
        error: "60s timeout waiting for the model response",
        evidencias: [],
      },
      {
        agente: "quality",
        estado: "pending",
        entrada: "",
        salida: null,
        inicioIso: null,
        finIso: null,
        latenciaMs: null,
        tokens: null,
        error: null,
        evidencias: [],
      },
      {
        agente: "capa",
        estado: "pending",
        entrada: "",
        salida: null,
        inicioIso: null,
        finIso: null,
        latenciaMs: null,
        tokens: null,
        error: null,
        evidencias: [],
      },
      {
        agente: "audit",
        estado: "pending",
        entrada: "",
        salida: null,
        inicioIso: null,
        finIso: null,
        latenciaMs: null,
        tokens: null,
        error: null,
        evidencias: [],
      },
    ],
  },
];

export const DEMO_KPIS: DashboardKpis = {
  procesosActivos: 2,
  tasaExito: 0.86,
  latenciaMediaMs: 2480,
  aprobacionesPendientes: 1,
  tokensHoy: 18420,
  costoMedioPorProcesoUsd: 0.037,
  tarifaUsdPor1kTokens: 0.002,
  procesosTotal: 14,
  latenciaPorAgente: [
    { agente: "knowledge", mediaMs: 2100, muestras: 14 },
    { agente: "quality", mediaMs: 1800, muestras: 14 },
    { agente: "capa", mediaMs: 3200, muestras: 9 },
    { agente: "audit", mediaMs: 900, muestras: 14 },
  ],
  citas: { pct: 0.87, verificadas: 13, totales: 15 },
};

export const DEMO_ACTIVITY: ActivityItem[] = [
  { id: "a1", texto: "NC-2026-1042 is waiting for CAPA approval", actor: "CAPA agent", fechaIso: iso(12), tipo: "aprobacion" },
  { id: "a2", texto: "NC-2026-1041 moved on to Quality", actor: "Knowledge agent", fechaIso: iso(58), tipo: "proceso" },
  { id: "a3", texto: "M. Ferrer approved the NC-2026-1040 CAPA plan", actor: "M. Ferrer", fechaIso: iso(1300), tipo: "aprobacion" },
  { id: "a4", texto: "Audit block #881 verified (chain OK)", actor: "Audit agent", fechaIso: iso(1300), tipo: "auditoria" },
  { id: "a5", texto: "NC-2026-1039 failed on a Knowledge timeout", actor: "System", fechaIso: iso(2800), tipo: "sistema" },
  { id: "a6", texto: "PROC-101 indexed into Knowledge Center", actor: "Knowledge agent", fechaIso: iso(2900), tipo: "documento" },
];

export const DEMO_DOCS: KnowledgeDoc[] = [
  { id: "MAN-012", titulo: "Sensor tolerance limits", fuente: "Plant manual", categoria: "Maintenance", actualizadoIso: iso(4320), fragmentos: 34, demo: true },
  { id: "PROC-034", titulo: "Non-conformity procedure", fuente: "Procedures", categoria: "Quality", actualizadoIso: iso(5600), fragmentos: 21, demo: true },
  { id: "PROC-101", titulo: "Labeling control plan", fuente: "Procedures", categoria: "Production", actualizadoIso: iso(2900), fragmentos: 18, demo: true },
  { id: "MAN-044", titulo: "Validated tank CIP cleaning", fuente: "Plant manual", categoria: "Maintenance", actualizadoIso: iso(7200), fragmentos: 27, demo: true },
  { id: "Q-07", titulo: "Incident history trending rule", fuente: "Quality system", categoria: "Quality", actualizadoIso: iso(9000), fragmentos: 9, demo: true },
  { id: "SEG-003", titulo: "Compressor safe startup", fuente: "Safety", categoria: "Safety", actualizadoIso: iso(11000), fragmentos: 15, demo: true },
];

export const DEMO_CHECKS: QualityCheck[] = [
  { id: "QC-881", lote: "B-88", procesoId: "NC-2026-1041", resultado: "en_revision", riesgo: "medio", inspector: "L. Vidal", fechaIso: iso(50), detalle: "40 units with the wrong variant label.", demo: true },
  { id: "QC-879", lote: "L3-N", procesoId: "NC-2026-1042", resultado: "no_apto", riesgo: "medio", inspector: "R. Casas", fechaIso: iso(180), detalle: "Thermal drift +4.2 °C across 3 batches.", demo: true },
  { id: "QC-874", lote: "M2-12", procesoId: "NC-2026-1040", resultado: "no_apto", riesgo: "alto", inspector: "M. Ferrer", fechaIso: iso(1400), detalle: "Particles after tank maintenance.", demo: true },
  { id: "QC-870", lote: "B-81", procesoId: "—", resultado: "apto", riesgo: "bajo", inspector: "L. Vidal", fechaIso: iso(3000), detalle: "Routine check with no findings.", demo: true },
];

export const DEMO_CAPAS: Capa[] = [
  {
    id: "CAPA-301",
    titulo: "Recalibrate sensor T-31 and strengthen verification",
    descripcion: "Calibration drift found on line 3 during the night shift.",
    estado: "pendiente_aprobacion",
    severidad: "mayor",
    responsable: "J. Ruiz",
    procesoId: "NC-2026-1042",
    vencimientoIso: iso(-20160),
    acciones: [
      { id: "a1", texto: "Recalibrate sensor T-31", hecha: false },
      { id: "a2", texto: "Retrain shift B", hecha: false },
      { id: "a3", texto: "Add weekly verification", hecha: false },
    ],
    demo: true,
  },
  {
    id: "CAPA-298",
    titulo: "Validated CIP cleaning on tank M-2",
    descripcion: "Gasket debris after scheduled maintenance.",
    estado: "cerrada",
    severidad: "critica",
    responsable: "A. Soler",
    procesoId: "NC-2026-1040",
    vencimientoIso: iso(-10080),
    acciones: [
      { id: "a1", texto: "Validated CIP cleaning", hecha: true },
      { id: "a2", texto: "Inspect remaining gaskets", hecha: true },
    ],
    demo: true,
  },
  {
    id: "CAPA-295",
    titulo: "Dual reel check on format changes",
    descripcion: "Preventive draft after a labeling incident.",
    estado: "borrador",
    severidad: "menor",
    responsable: "L. Vidal",
    procesoId: "NC-2026-1041",
    vencimientoIso: iso(-30240),
    acciones: [{ id: "a1", texto: "Define the change checklist", hecha: false }],
    demo: true,
  },
];

/** Cadena hash demo con el mismo esquema que ledger.py. */
function hashDemo(semilla: string): string {
  let h1 = 0xdeadbeef ^ semilla.length;
  let h2 = 0x41c6ce57 ^ semilla.length;
  for (let i = 0; i < semilla.length; i++) {
    const ch = semilla.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const base = (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
  return (base.repeat(4) + base).slice(0, 64);
}

/** Reproduce ledger._calc_hash a efectos visuales (demo, no SHA-256 real). */
export function cadenaDemo(previo: string, ts: string, agente: string, entrada: string, salida: string): string {
  return hashDemo(`${previo}|${ts}|${agente}|${entrada}|${salida}`);
}

function construirAuditoria(): AuditEvent[] {
  const crudo: Array<[string, string, string, string]> = [
    ["audit", "alta_nc", "NC-2026-1040: Particles in mixing tank M-2", iso(1440)],
    ["knowledge", "NC-2026-1040", '{"causa_probable":"Gasket debris"}', iso(1430)],
    ["quality", "NC-2026-1040", '{"riesgo":"alto","requiere_capa":true}', iso(1427)],
    ["capa", "NC-2026-1040", '{"acciones":["CIP cleaning"],"responsable":"A. Soler"}', iso(1424)],
    ["audit", "alta_nc", "NC-2026-1042: Temperature drift on line 3", iso(190)],
    ["knowledge", "NC-2026-1042", '{"causa_probable":"T-31 calibration drift"}', iso(185)],
    ["quality", "NC-2026-1042", '{"riesgo":"medio","requiere_capa":true}', iso(182)],
    ["audit", "alta_nc", "NC-2026-1041: Mislabeling on batch B-88", iso(65)],
  ];
  let previo = "GENESIS";
  return crudo.map(([agente, entrada, salida, ts], i) => {
    const hash = cadenaDemo(previo, ts, agente, entrada, salida);
    const ev: AuditEvent = { id: i + 1, ts, agente, entrada, salida, hashPrevio: previo, hash, demo: true };
    previo = hash;
    return ev;
  });
}

export const DEMO_AUDIT: AuditEvent[] = construirAuditoria();

export const DEMO_ANALYTICS: AnalyticsSummary = {
  procesosPorDia: [
    { dia: "Wed 29", total: 3, exito: 3 },
    { dia: "Thu 30", total: 5, exito: 4 },
    { dia: "Fri 31", total: 2, exito: 2 },
    { dia: "Sat 1", total: 1, exito: 1 },
    { dia: "Sun 2", total: 2, exito: 1 },
    { dia: "Mon 3", total: 4, exito: 3 },
    { dia: "Tue 4", total: 3, exito: 2 },
  ],
  latenciaPorAgente: [
    { dia: "Wed 29", knowledge: 1.8, quality: 2.1, capa: 3.2, audit: 0.6 },
    { dia: "Thu 30", knowledge: 2.0, quality: 2.3, capa: 3.4, audit: 0.7 },
    { dia: "Fri 31", knowledge: 1.7, quality: 2.0, capa: 3.0, audit: 0.5 },
    { dia: "Sat 1", knowledge: 1.9, quality: 2.2, capa: 3.1, audit: 0.6 },
    { dia: "Sun 2", knowledge: 2.2, quality: 2.6, capa: 3.8, audit: 0.8 },
    { dia: "Mon 3", knowledge: 1.9, quality: 2.1, capa: 3.2, audit: 0.6 },
    { dia: "Tue 4", knowledge: 1.8, quality: 2.2, capa: 3.4, audit: 0.6 },
  ],
  distribucionEstados: [
    { estado: "Success", valor: 16 },
    { estado: "Running", valor: 2 },
    { estado: "Waiting", valor: 1 },
    { estado: "Error", valor: 1 },
  ],
  tokensPorAgente: [
    { agente: "knowledge", tokens: 6840 },
    { agente: "quality", tokens: 5210 },
    { agente: "capa", tokens: 4980 },
    { agente: "audit", tokens: 1390 },
  ],
};
