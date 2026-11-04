# EXPERTIUM — Frontend (etapa 1)

Plataforma multiagente (Knowledge, Quality, CAPA, Audit). Etapa 1: **solo frontend**,
con datos demo locales claramente identificados. Sin conexiones reales al backend.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · componentes estilo shadcn/ui ·
Lucide Icons · gráficos SVG propios (sin dependencias de charts).

## Ejecutar en Windows

```bat
cd frontend
copy .env.example .env
npm install
npm run dev
```

Abre http://localhost:5173 en el navegador.

Otros comandos:

```bat
npm run build     :: compila a dist/
npm run preview   :: sirve el build en http://localhost:4173
```

## Estructura

```text
frontend/
├── src/
│   ├── lib/          contrato API: types.ts, api.ts (servicios), format.ts,
│   │                 expediente.ts (dossier Markdown), utils.ts
│   ├── mocks/        datos demo (demo: true) con los mismos tipos del contrato
│   ├── hooks/        useApi (loading/success/error+retry), useTheme
│   ├── components/
│   │   ├── ui/       primitivas reutilizables: button, card, badge, forms…
│   │   ├── layout/   Shell: sidebar, topbar, responsive
│   │   ├── agents/   PipelineFlow, StepDetail, RunCard, StatusBadge
│   │   └── charts.tsx Sparkline, Bars, Donut (SVG)
│   ├── pages/        9 pantallas: Dashboard, Workspace, Expediente,
│   │                 Knowledge, Quality, Capas, Audit, Analytics, Settings
│   ├── App.tsx       navegación por estado + hash, tema
│   └── index.css     Tailwind v4 + tokens de marca + animaciones
└── docs/API_CONTRACT.md  endpoints que necesitará el backend FastAPI
```

## Pantallas

1. **Dashboard** — KPIs, procesos recientes, actividad, estado de agentes.
2. **Agent Workspace** — crear procesos, flujo visual de 4 agentes, detalle
   de entradas/salidas JSON, latencias, tokens y evidencias.
3. **Expediente** — dossier por proceso con fuentes citadas, CAPA, hashes
   y exportación Markdown.
4. **Knowledge Center** — base documental con búsqueda.
5. **Quality Control** — inspecciones con filtros y enlace al proceso.
6. **CAPA Management** — acciones correctivas con aprobación humana.
7. **Audit Trail** — cadena hash con verificación (equivale a `verify_chain()`).
8. **Analytics** — volumen, latencia por agente, tokens.
9. **Settings** — backend, agentes, tema y simulador de fallo de red.

## Conectar el backend (etapa 2)

1. Implementa los endpoints de `docs/API_CONTRACT.md` en FastAPI.
2. Pon `VITE_DEMO_MODE=false` y `VITE_API_URL=…` en `frontend/.env`.
3. Las funciones de `src/lib/api.ts` usan `fetch` con las mismas firmas;
   los componentes no cambian.
