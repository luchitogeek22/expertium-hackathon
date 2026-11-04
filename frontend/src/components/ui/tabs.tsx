import * as React from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  etiqueta: string;
}

export function Tabs({
  tabs,
  activo,
  onChange,
}: {
  tabs: Tab[];
  activo: string;
  onChange: (id: string) => void;
}): React.JSX.Element {
  return (
    <div role="tablist" aria-label="Tabs" className="flex gap-1 rounded-lg bg-zinc-200/70 p-1 dark:bg-white/5">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={activo === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70",
            activo === t.id
              ? "bg-white text-zinc-900 shadow-sm dark:bg-graphite-700 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
          )}
        >
          {t.etiqueta}
        </button>
      ))}
    </div>
  );
}
