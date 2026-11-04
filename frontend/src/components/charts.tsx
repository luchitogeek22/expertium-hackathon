/** Gráficos SVG propios (sin dependencias): sparkline, barras y anillo. */
import * as React from "react";

/** Minigráfico de área. */
export function Sparkline({
  valores,
  className,
}: {
  valores: number[];
  className?: string;
}): React.JSX.Element {
  const w = 120;
  const h = 36;
  const max = Math.max(...valores, 1);
  const min = Math.min(...valores, 0);
  const rango = max - min || 1;
  const pts = valores.map((v, i) => {
    const x = (i / Math.max(1, valores.length - 1)) * w;
    const y = h - 3 - ((v - min) / rango) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linea = `M${pts.join(" L")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className ?? "h-9 w-28"} aria-hidden>
      <path d={`${linea} L${w},${h} L0,${h} Z`} fill="currentColor" opacity="0.14" />
      <path d={linea} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Barras agrupadas total/éxito. */
export function Bars({
  datos,
  alto = 180,
}: {
  datos: Array<{ etiqueta: string; total: number; exito: number }>;
  alto?: number;
}): React.JSX.Element {
  const max = Math.max(...datos.map((d) => d.total), 1);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-end gap-3" style={{ minHeight: alto }} role="img" aria-label="Processes per day">
        {datos.map((d) => (
          <div key={d.etiqueta} className="flex flex-1 flex-col items-center gap-1.5" title={`${d.etiqueta}: ${d.exito}/${d.total} success`}>
            <div className="flex w-full max-w-14 items-end gap-1" style={{ height: alto }}>
              <div
                className="flex-1 rounded-t bg-zinc-300 transition-all dark:bg-white/15"
                style={{ height: `${(d.total / max) * 100}%` }}
              />
              <div
                className="flex-1 rounded-t bg-blue-600 dark:bg-cyan-400"
                style={{ height: `${(d.exito / max) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500">{d.etiqueta}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-white/25" /> Total
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400" /> Success
        </span>
      </div>
    </div>
  );
}

/** Anillo de distribución. */
export function Donut({
  segmentos,
  centro,
}: {
  segmentos: Array<{ etiqueta: string; valor: number; color: string }>;
  centro: string;
}): React.JSX.Element {
  const total = segmentos.reduce((a, s) => a + s.valor, 0) || 1;
  const R = 54;
  const C = 2 * Math.PI * R;
  let acumulado = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Status distribution">
          <circle cx="70" cy="70" r={R} fill="none" strokeWidth="16" className="stroke-zinc-200 dark:stroke-white/8" />
          {segmentos.map((s) => {
            const frac = s.valor / total;
            const el = (
              <circle
                key={s.etiqueta}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                strokeWidth="16"
                stroke={s.color}
                strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`}
                strokeDashoffset={(-acumulado * C).toFixed(1)}
                strokeLinecap="butt"
                transform="rotate(-90 70 70)"
              />
            );
            acumulado += frac;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-2xl font-bold">{centro}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2 text-[13px]">
        {segmentos.map((s) => (
          <li key={s.etiqueta} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="font-semibold">{s.etiqueta}</span>
            <span className="text-zinc-500">{s.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
