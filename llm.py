"""Cliente para Meta Model API (Spark 1.3) compatible con OpenAI."""
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, ValidationError

load_dotenv()

logger = logging.getLogger(__name__)

META_API_KEY = os.getenv("META_API_KEY", "")
META_BASE_URL = os.getenv("META_BASE_URL", "https://api.meta.ai/v1")
META_MODEL = os.getenv("META_MODEL", "muse-spark-1.3")

DEFAULT_TIMEOUT = 60.0
DEFAULT_EFFORT = "low"        # minimal | low | medium | high | xhigh
DEFAULT_MAX_TOKENS = 2000     # incluye los tokens de razonamiento


@dataclass
class CallResult:
    """Respuesta completa de un agente: modelo validado + uso + latencia."""
    data: BaseModel
    usage: dict[str, Any] = field(default_factory=dict)
    latency_s: float = 0.0


def _get_client(timeout: float) -> OpenAI:
    if not META_API_KEY:
        raise RuntimeError("Falta META_API_KEY en el entorno (.env).")
    return OpenAI(api_key=META_API_KEY, base_url=META_BASE_URL, timeout=timeout)


def call_agent_full(rol: str, entrada: str, esquema_pydantic: type[BaseModel],
                    timeout: float = DEFAULT_TIMEOUT,
                    effort: str = DEFAULT_EFFORT,
                    max_tokens: int = DEFAULT_MAX_TOKENS) -> CallResult:
    """Llama a un agente Spark y valida la respuesta con Pydantic.

    effort controla cuanto razona el modelo (reasoning_effort).
    Reintenta una vez si el JSON es invalido o no cumple el esquema.
    Registra tokens, tokens de razonamiento y latencia en el log y los
    devuelve en CallResult para persistencia (orquestador).
    """
    client = _get_client(timeout)
    schema_json = json.dumps(esquema_pydantic.model_json_schema(), ensure_ascii=False)
    messages = [
        {"role": "system", "content": rol},
        {"role": "user", "content": (
            f"{entrada}\n\nResponde SOLO con un JSON valido que cumpla "
            f"este esquema JSON Schema:\n{schema_json}"
        )},
    ]

    last_error: str = ""
    for intento in (1, 2):
        start = time.perf_counter()
        response = client.chat.completions.create(
            model=META_MODEL,
            messages=messages,  # type: ignore[arg-type]
            temperature=0.2,
            response_format={"type": "json_object"},
            reasoning_effort=effort,
            max_completion_tokens=max_tokens,
        )
        latency = time.perf_counter() - start
        usage = response.usage
        choice = response.choices[0]
        content = choice.message.content or ""
        reasoning = getattr(
            getattr(usage, "completion_tokens_details", None), "reasoning_tokens", "?"
        )
        logger.info(
            "call_agent intento=%d modelo=%s effort=%s latencia=%.2fs "
            "prompt=%s completion=%s razonamiento=%s total=%s finish=%s",
            intento, META_MODEL, effort, latency,
            getattr(usage, "prompt_tokens", "?"),
            getattr(usage, "completion_tokens", "?"),
            reasoning,
            getattr(usage, "total_tokens", "?"),
            choice.finish_reason,
        )
        prompt_t = getattr(usage, "prompt_tokens", 0) or 0
        compl_t = getattr(usage, "completion_tokens", 0) or 0
        total_t = getattr(usage, "total_tokens", 0) or 0
        razon = getattr(
            getattr(usage, "completion_tokens_details", None), "reasoning_tokens", None
        )
        uso = {"prompt": int(prompt_t), "completion": int(compl_t),
               "total": int(total_t),
               "razonamiento": int(razon) if isinstance(razon, int) else None}
        try:
            data = json.loads(content)
            modelo = esquema_pydantic.model_validate(data)
            return CallResult(data=modelo, usage=uso, latency_s=latency)
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = str(exc)
            logger.warning("call_agent intento=%d JSON invalido: %s", intento, last_error)
            if choice.finish_reason == "length":
                max_tokens *= 2  # se agotó el presupuesto, probablemente pensando
            messages.append({"role": "assistant", "content": content})
            messages.append({"role": "user", "content": (
                "Tu respuesta anterior no es un JSON valido para el esquema. "
                f"Error: {last_error}\nReenviala corregida, SOLO el JSON."
            )})
    raise ValueError(f"JSON invalido tras 2 intentos: {last_error}")


def call_agent(rol: str, entrada: str, esquema_pydantic: type[BaseModel],
               timeout: float = DEFAULT_TIMEOUT,
               effort: str = DEFAULT_EFFORT,
               max_tokens: int = DEFAULT_MAX_TOKENS) -> BaseModel:
    """Igual que call_agent_full pero devuelve solo el modelo validado."""
    return call_agent_full(rol, entrada, esquema_pydantic,
                           timeout=timeout, effort=effort,
                           max_tokens=max_tokens).data
