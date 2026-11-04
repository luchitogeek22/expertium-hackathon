# Expertium (esqueleto)

Flujo de 4 agentes (Knowledge, Quality, CAPA, Audit) sobre Meta Model API (Spark 1.3).

## Ficheros

- `llm.py`: `call_agent(rol, entrada, esquema_pydantic)` contra API compatible OpenAI.
- `ledger.py`: SQLite append-only con hash SHA-256 encadenado + `verify_chain()`.
- `app.py`: Streamlit de 5 pasos con salidas simuladas.
- `smoke_test.py`: llamada real a Spark, imprime respuesta y tokens.

## Puesta en marcha (Windows)

```bat
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
rem edita .env y pon tu META_API_KEY
streamlit run app.py
python smoke_test.py
```

Docs oficiales: `https://dev.meta.ai/docs/quickstart`
(`base_url=https://api.meta.ai/v1`, modelo `muse-spark-1.3`).

## Frontend (etapa 1)

App React + Vite en `frontend/` (ver `frontend/README.md`):

```bat
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173. Etapa 1: solo datos demo, sin backend.

## Backend (etapa 2)

API FastAPI en `backend/` (ver `backend/README.md`):

```bat
pip install -r requirements.txt
venv\Scripts\python.exe -m uvicorn backend.app.main:app --port 8000
venv\Scripts\python.exe -m pytest backend\tests -q
```

Docs en http://localhost:8000/docs. Requiere `META_API_KEY` en `.env`
para llamadas reales a Spark.
