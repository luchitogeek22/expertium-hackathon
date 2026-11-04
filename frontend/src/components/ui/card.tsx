import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.05)]",
        "dark:border-white/8 dark:bg-graphite-900 dark:shadow-[0_8px_28px_-12px_rgb(0_0_0/0.7)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("flex items-start justify-between gap-3 px-5 pt-4 pb-1", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return <h3 className={cn("font-display text-[15px] font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return <p className={cn("mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
