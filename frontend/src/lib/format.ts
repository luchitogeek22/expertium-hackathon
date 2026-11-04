/** Formateo de fechas, números y hashes. */

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fechaDia(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
}

export function hace(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function miles(n: number): string {
  return n.toLocaleString("en-US");
}

export function msCorto(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function porciento(tanto: number): string {
  return `${Math.round(tanto * 100)}%`;
}

export function dinero(usd: number): string {
  return `$${usd.toFixed(3)}`;
}

/** Acorta un hash SHA-256: `a1b2…9f04`. */
export function hashCorto(hash: string): string {
  if (hash === "GENESIS") return "GENESIS";
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}
