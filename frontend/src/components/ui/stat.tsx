import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export function StatCard({
  icono: Icono,
  etiqueta,
  valor,
  detalle,
  acento = "text-blue-500 dark:text-blue-400",
}: {
  icono: LucideIcon;
  etiqueta: string;
  valor: string;
  detalle?: string;
  acento?: string;
}): React.JSX.Element {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400">{etiqueta}</p>
        <span className={cn("rounded-lg bg-zinc-200/60 p-1.5 dark:bg-white/6", acento)}>
          <Icono className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="font-display mt-2 text-[28px] leading-none font-bold tracking-tight">{valor}</p>
      {detalle && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{detalle}</p>}
    </Card>
  );
}

export function PageHeader({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion: string;
  acciones?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-[28px]">{titulo}</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{descripcion}</p>
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}
