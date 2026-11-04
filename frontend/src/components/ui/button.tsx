import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-blue-600 text-white shadow-[0_4px_16px_-4px_rgb(37_99_235/0.6)] hover:bg-blue-500",
        secondary:
          "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-graphite-700 dark:text-zinc-100 dark:hover:bg-graphite-700/70",
        ghost: "text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100",
        danger: "bg-rose-600/15 text-rose-500 ring-1 ring-rose-500/30 ring-inset hover:bg-rose-600/25",
        success: "bg-emerald-600 text-white shadow-[0_4px_16px_-4px_rgb(5_150_105/0.6)] hover:bg-emerald-500",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9.5 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type, ...props }: ButtonProps): React.JSX.Element {
  return (
    <button
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
