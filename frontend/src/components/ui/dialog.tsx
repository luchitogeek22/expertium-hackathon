import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Diálogo modal accesible (Esc + clic en fondo para cerrar). */
export function Dialog({
  open,
  onClose,
  titulo,
  descripcion,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
  wide?: boolean;
}): React.JSX.Element | null {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-fade-up sm:rounded-2xl dark:border-white/10 dark:bg-graphite-900",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">{titulo}</h2>
            {descripcion && <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="cursor-pointer rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:hover:bg-white/8 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
