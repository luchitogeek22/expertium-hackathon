import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type ApiState } from "@/lib/types";

export interface ApiResult<T> {
  estado: ApiState;
  datos: T | null;
  error: string | null;
  recargar: () => void;
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Ejecuta una función API y expone loading/success/error + reintento.
 * Reintenta una vez con backoff ante fallos transitorios (red, timeout,
 * HTTP 5xx); el usuario puede reintentar siempre con `recargar`.
 */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = [], reintentos = 1): ApiResult<T> {
  const [estado, setEstado] = useState<ApiState>("loading");
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const viva = useRef(true);

  useEffect(() => {
    viva.current = true;
    setEstado("loading");
    setError(null);

    const intentar = async (intento: number): Promise<void> => {
      try {
        const d = await fn();
        if (!viva.current) return;
        setDatos(d);
        setEstado("success");
      } catch (e: unknown) {
        if (!viva.current) return;
        const codigo = e instanceof ApiError ? e.codigo : "";
        const transitorio =
          codigo === "NETWORK" || codigo === "TIMEOUT" || codigo.startsWith("HTTP_5");
        if (transitorio && intento < reintentos) {
          await esperar(800 * (intento + 1));
          if (!viva.current) return;
          await intentar(intento + 1);
          return;
        }
        setError(e instanceof Error ? e.message : "Unknown error");
        setEstado("error");
      }
    };
    void intentar(0);

    return () => {
      viva.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  const recargar = useCallback(() => setNonce((n) => n + 1), []);

  return { estado, datos, error, recargar };
}
