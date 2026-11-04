import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { DEMO_MODE } from "@/lib/api";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] leading-4 font-semibold tracking-wide whitespace-nowrap uppercase",
  {
    variants: {
      tone: {
        info: "bg-blue-600/12 text-blue-600 ring-1 ring-blue-500/25 ring-inset dark:text-blue-300",
        success: "bg-emerald-600/12 text-emerald-700 ring-1 ring-emerald-500/25 ring-inset dark:text-emerald-300",
        warning: "bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/30 ring-inset dark:text-amber-300",
        danger: "bg-rose-600/12 text-rose-600 ring-1 ring-rose-500/30 ring-inset dark:text-rose-300",
        neutral: "bg-zinc-500/12 text-zinc-600 ring-1 ring-zinc-500/25 ring-inset dark:text-zinc-300",
        cyan: "bg-cyan-500/12 text-cyan-700 ring-1 ring-cyan-500/30 ring-inset dark:text-cyan-300",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps): React.JSX.Element {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Etiqueta DEMO para datos sin backend. Oculta con backend real. */
export function DemoBadge(): React.JSX.Element | null {
  if (!DEMO_MODE) return null;
  return (
    <Badge tone="cyan" title="Local demo data, no backend connected">
      Demo
    </Badge>
  );
}
