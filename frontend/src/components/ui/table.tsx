import * as React from "react";
import { cn } from "@/lib/utils";

/** Tabla responsive: scroll horizontal en móvil. */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>): React.JSX.Element {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/8">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return <thead className={cn("bg-zinc-100 dark:bg-white/4", className)} {...props} />;
}

export function TRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>): React.JSX.Element {
  return (
    <tr
      className={cn("border-t border-zinc-200 transition-colors first:border-t-0 hover:bg-zinc-100/70 dark:border-white/8 dark:hover:bg-white/4", className)}
      {...props}
    />
  );
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  return (
    <th className={cn("px-4 py-2.5 text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400", className)} {...props} />
  );
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  return <td className={cn("px-4 py-3 align-top text-[13px]", className)} {...props} />;
}
