import logging
from pydantic import BaseModel
from llm import call_agent

logging.basicConfig(level=logging.INFO, format="%(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpx2").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)


class Saludo(BaseModel):
    respuesta: str


for effort in ("minimal", "low", "medium"):
    for _ in range(2):  # dos repeticiones para ver la variación
        try:
            call_agent("Eres un asistente breve.", "Saluda en una frase.",
                       Saludo, effort=effort)
        except Exception as e:
            print(f"effort={effort} ERROR: {e}")