# Contrato de endpoints — backend FastAPI (etapa 2)

Tipos fuente: `frontend/src/lib/types.ts`. Todas las respuestas son JSON.
Base: `VITE_API_URL` (por defecto `http://localhost:8000`).

## Lecturas

| Método | Ruta | Respuesta | Origen Python actual |
|---|---|---|---|
| GET | `/api/agents` | `AgentInfo[]` | config de `llm.py` (modelo, effort, timeout) |
| GET | `/api/runs` | `AgentRun[]` | pasos de `app.py` + `ledger.list_events()` |
| GET | `/api/runs/{id}` | `AgentRun` | idem, un proceso |
| GET | `/api/dashboard/kpis` | `DashboardKpis` | agregados de runs |
| GET | `/api/dashboard/activity` | `ActivityItem[]` | últimos eventos del ledger |
| GET | `/api/knowledge/docs` | `KnowledgeDoc[]` | base documental |
| GET | `/api/quality/checks` | `QualityCheck[]` | salidas del agente Quality |
| GET | `/api/capas` | `Capa[]` | salidas del agente CAPA |
| GET | `/api/audit/events` | `AuditEvent[]` | `ledger.list_events()` |
| GET | `/api/analytics/summary` | `AnalyticsSummary` | agregados de runs y tokens |
| GET | `/api/health` | `{status, modelo, db}` | estado del backend y la DB |
| GET | `/api/processes/{id}/results` | `{id, estado, actual, pasos, aprobadoPor}` | pasos y estado final |

## Escrituras

| Método | Ruta | Cuerpo | Respuesta | Notas |
|---|---|---|---|---|
| POST | `/api/runs` | `NewRunInput {titulo, descripcion}` | `AgentRun` | crea proceso (alias de `/api/processes`) |
| POST | `/api/runs/{id}/run` | — | `AgentRun` | ejecuta Knowledge→Quality→CAPA→Audit (alias de `/api/processes/{id}/run`); tarda 1–2 min; 409 si ya corrió |
| POST | `/api/knowledge/docs` | multipart `archivo` + `titulo?`, `categoria?`, `fuente?` | `KnowledgeDoc` | registra el doc con su conteo real de párrafos; 400 si vacío, 413 si >5 MB |
| POST | `/api/capas/{id}/approve` | `{aprobador: string}` | `Capa` | aprobación humana obligatoria |
| POST | `/api/audit/verify` | — | `{ok: boolean, eventos: number}` | `ledger.verify_chain()` |
| POST | `/api/audit/demo-tamper` | `{confirmar: "BREAK"}` | `{ok, evento}` | DEMO: corrompe el evento 1 (rompe el ledger de verdad; 400 sin confirmación, 404 sin eventos, 409 si ya rota) |

## Formatos clave

- Fechas: ISO 8601 UTC (`2026-11-04T12:30:00+00:00`).
- `RunStatus`: `pending | running | success | error | waiting_approval`.
- `CapaEstado`: `borrador | en_curso | pendiente_aprobacion | aprobada | cerrada | rechazada`.
- `AuditEvent`: `{id, ts, agente, entrada, salida, hashPrevio, hash}` donde
  `hash = sha256(f"{hashPrevio}|{ts}|{agente}|{entrada}|{salida}")` y el
  primer `hashPrevio` es `"GENESIS"` (ver `ledger.py`).
- `AgentStep.salida`: objeto JSON libre validado con Pydantic en `call_agent`.
- La salida de Knowledge incluye `abstencion` y `motivo_abstencion`: si
  ningún documento respalda el análisis, el agente se abstiene (sin
  inventar causas) y la interfaz lo muestra en el detalle y el expediente.
- `TokenUsage`: `{prompt, completion, total, razonamiento?}`.
- `DashboardKpis` añade `costoMedioPorProcesoUsd` (tokens reales ×
  `tarifaUsdPor1kTokens`, tarifa de referencia expuesta en la respuesta),
  `latenciaPorAgente[]` (medias reales de `steps`) y
  `citas {pct, verificadas, totales}` (citas de Knowledge que existen
  en la base documental).
- `KnowledgeDoc.demo=true` marca datos sembrados de demostración
  (la interfaz los etiqueta como "datos de demostración").
- Errores: HTTP 4xx/5xx con `{codigo, mensaje}`; el frontend los muestra con
  reintento (`ErrorBlock` + `useApi.recargar`).

## Activación

Con el backend listo: `VITE_DEMO_MODE=false` en `frontend/.env`.
`src/lib/api.ts` conmuta automáticamente de mocks a `fetch`; ningún
componente necesita cambios.
