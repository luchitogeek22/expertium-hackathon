"""Prueba real minima contra Spark 1.3: imprime respuesta y tokens."""
import logging
import os

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

from llm import META_BASE_URL, META_MODEL, call_agent

logging.basicConfig(level=logging.INFO)
load_dotenv()


class Eco(BaseModel):
    respuesta: str


def main() -> None:
    if not os.getenv("META_API_KEY"):
        raise SystemExit("Falta META_API_KEY: copia .env.example a .env y rellénala.")

    # Llamada directa (sin Pydantic) para mostrar uso crudo.
    client = OpenAI(api_key=os.getenv("META_API_KEY"), base_url=META_BASE_URL,
                    timeout=60.0)
    raw = client.chat.completions.create(
        model=META_MODEL,
        messages=[{"role": "user", "content": "Responde con: OK Spark"}],
    )
    print("== directa ==")
    print(raw.choices[0].message.content)
    print("usage:", raw.usage)

    # Llamada validada con Pydantic (usa call_agent, registra tokens/latencia).
    print("== call_agent ==")
    out = call_agent("Eres un asistente conciso.", "Saluda en una frase.", Eco)
    print(out.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
