import * as React from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }): React.JSX.Element {
  return <div className={cn("animate-pulse rounded-lg bg-zinc-200 dark:bg-white/8", className)} aria-hidden />;
}

export function Spinner({ className }: { className?: string }): React.JSX.Element {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden />;
}

export function Progress({ value, className }: { value: number; className?: string }): React.JSX.Element {
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/8", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-blue-600 transition-[width] duration-500 dark:bg-cyan-400"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function LoadingBlock({ texto = "Loading…" }: { texto?: string }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={texto}>
      <Skeleton className="h-9 w-2/5" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function ErrorBlock({ mensaje, onRetry }: { mensaje: string; onRetry: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-600/5 px-6 py-10 text-center" role="alert">
      <AlertTriangle className="h-8 w-8 text-rose-500" aria-hidden />
      <p className="text-sm font-semibold">Couldn't load</p>
      <p className="max-w-sm text-[13px] text-zinc-500 dark:text-zinc-400">{mensaje}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function EmptyBlock({ titulo, detalle }: { titulo: string; detalle: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-white/15">
      <Inbox className="h-8 w-8 text-zinc-400" aria-hidden />
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="max-w-sm text-[13px] text-zinc-500 dark:text-zinc-400">{detalle}</p>
    </div>
  );
}
