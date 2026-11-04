# EXPERTIUM — Backend (FastAPI)

Orquestador multiagente real: Knowledge → Quality → CAPA → Audit sobre
Meta Model API (Spark 1.3), con SQLite, ledger SHA-256 y endpoints para
el frontend existente. Sin mocks en producción: los mocks solo existen
en `backend/tests`.

## Instalación en Windows

Desde la raíz del repo (el `venv` ya existe):

```bat
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
rem edita .env y pon tu META_API_KEY
```

## Ejecución

Siempre desde la raíz del repo:

```bat
venv\Scripts\python.exe -m uvicorn backend.app.main:app --port 8000
```

- API: http://localhost:8000
- OpenAPI: http://localhost:8000/docs
- DB: `backend/data/expertium.db` (se crea sola; respeta `EXPERTIUM_DB`)

## Variables de entorno

| Variable | Defecto | Notas |
|---|---|---|
| `META_API_KEY` | — | Obligatoria para llamadas reales. Nunca sale del backend |
| `META_BASE_URL` | `https://api.meta.ai/v1` | |
| `META_MODEL` | `muse-spark-1.3` | |
| `EXPERTIUM_DB` | `backend/data/expertium.db` | |
| `CORS_ORIGINS` | `http://localhost:5173` | Separadas por comas |
| `SEED_DOCS` | `true` | Precarga 6 documentos de referencia |

## Endpoints

Canónicos (OpenAPI en `/docs`):

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado, modelo y DB |
| GET | `/api/agents` | Fichas de los 4 agentes |
| POST | `/api/processes` | Crear proceso (`titulo`, `descripcion`, `lote?`) |
| GET | `/api/processes` | Listar con pasos |
| GET | `/api/processes/{id}` | Detalle con pasos |
| POST | `/api/processes/{id}/run` | Ejecutar pipeline (síncrono v1; 409 si ya corrió) |
| GET | `/api/processes/{id}/results` | Pasos y estado final |
| GET | `/api/audit/events?limit=` | Eventos del ledger (máx 500) |
| GET | `/api/audit/verify` | `{ok, eventos}` (`verify_chain()`) |
| POST | `/api/audit/demo-tamper` | DEMO: corrompe el evento 1 (`{confirmar: "BREAK"}`); rompe el ledger hasta borrar la DB |
| GET | `/api/analytics/summary` | Volumen, latencia, estados, tokens |
| GET | `/api/dashboard/kpis` | Indicadores ejecutivos |
| GET | `/api/dashboard/activity` | Actividad desde el ledger |
| GET | `/api/knowledge/docs` | Documentos de referencia |
| POST | `/api/knowledge/docs` | Subida multipart (`archivo`, máx 5 MB) con conteo real de fragmentos |
| GET | `/api/quality/checks` | Inspecciones generadas por Quality |
| GET | `/api/capas` | CAPAs generadas por el agente CAPA |
| POST | `/api/capas/{id}/approve` | Aprobación humana (`{aprobador}`) |

Compatibilidad con el contrato TS de la etapa 1 (ocultos en OpenAPI):
`GET/POST /api/runs`, `GET /api/runs/{id}`, `POST /api/runs/{id}/run`,
`POST /api/audit/verify`. Mismos handlers, mismas respuestas.

## Reglas del orquestador

- Si un agente falla (timeout, JSON inválido, error API), el proceso queda
  en `error` y los siguientes NO se ejecutan.
- Knowledge recibe el catálogo documental y se abstiene
  (`abstencion=true`, sin documentos) cuando nada lo respalda; el flujo
  continúa y Quality recibe el aviso en su entrada.
- Si Quality decide que no requiere CAPA, el paso CAPA se registra como
  éxito con `acciones: []` y motivo (sin llamar al modelo).
- Si CAPA propone acciones, el paso queda `waiting_approval` y el proceso
  también; Audit se ejecuta igual y verifica la cadena real.
- `POST .../approve` cierra la CAPA y, si todo está en éxito, el proceso.
- Errores normalizados: `{codigo, mensaje}` (400/404/409/422/500).

## Pruebas

```bat
venv\Scripts\python.exe -m pytest backend\tests -q
```

13 pruebas: orquestador (flujo, sin-CAPA, corte por fallo, reintentos),
endpoints, aliases, aprobación, ledger (encadenado + manipulación),
analítica y CORS. Solo mockean `call_agent_full`; SQLite, ledger, HTTP
y pipeline son reales.

Comprobación real contra Spark (requiere `.env` con clave):

```bat
venv\Scripts\python.exe smoke_test.py
```

## Integración con el frontend (sin tocar `frontend/`)

1. Arranca el backend (`:8000`) y el frontend (`npm run dev`, `:5173`).
2. En `frontend/.env`: `VITE_DEMO_MODE=false`
   (`VITE_API_URL=http://localhost:8000` ya es el defecto).
3. Todo funciona salvo **ejecutar**: la etapa 1 no tiene botón Run.

### Modificación necesaria en el frontend (etapa 2)

Añadir en `frontend/src/lib/api.ts`:

```ts
ejecutarProceso: (id: string): Promise<AgentRun> =>
  DEMO_MODE ? demo(DEMO_RUNS[0]) : real<AgentRun>(`/api/processes/${id}/run`, { method: "POST" }),
```

y en `Workspace.tsx` un botón «Ejecutar pipeline» que llame a
`api.ejecutarProceso(run.id)` y recargue el detalle. El resto de rutas
(`/api/runs*`, `POST /api/audit/verify`) ya están cubiertas por aliases.

Diferencias menores documentadas: `demo: false` en respuestas reales,
etiquetas de día en formato `mm/dd`, y campo opcional `lote` al crear.
