import * as React from "react";
import { cn } from "@/lib/utils";

const fieldRing =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 dark:border-white/10 dark:bg-graphite-850 dark:text-zinc-100 dark:placeholder:text-zinc-500";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return <input className={cn(fieldRing, "h-9.5 w-full", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>): React.JSX.Element {
  return <textarea className={cn(fieldRing, "min-h-24 w-full resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>): React.JSX.Element {
  return (
    <select className={cn(fieldRing, "h-9.5 w-full cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

export function FieldLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>): React.JSX.Element {
  return (
    <label className={cn("mb-1.5 block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300", className)} {...props} />
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70",
        checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-graphite-700",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
