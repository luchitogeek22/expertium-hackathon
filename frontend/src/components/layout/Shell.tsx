import * as React from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_MODE } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/hooks/useTheme";

export type PageKey =
  | "dashboard"
  | "workspace"
  | "expediente"
  | "knowledge"
  | "quality"
  | "capas"
  | "audit"
  | "analytics"
  | "settings";

const NAV: Array<{ id: PageKey; etiqueta: string; icono: typeof LayoutDashboard; grupo?: string }> = [
  { id: "dashboard", etiqueta: "Dashboard", icono: LayoutDashboard },
  { id: "workspace", etiqueta: "Agent Workspace", icono: Bot },
  { id: "expediente", etiqueta: "Case File", icono: FileText },
  { id: "knowledge", etiqueta: "Knowledge Center", icono: BookOpen, grupo: "Agents" },
  { id: "quality", etiqueta: "Quality Control", icono: ShieldCheck, grupo: "Agents" },
  { id: "capas", etiqueta: "CAPA Management", icono: Wrench, grupo: "Agents" },
  { id: "audit", etiqueta: "Audit Trail", icono: FlaskConical, grupo: "Governance" },
  { id: "analytics", etiqueta: "Analytics", icono: BarChart3, grupo: "Governance" },
  { id: "settings", etiqueta: "Settings", icono: SettingsIcon, grupo: "Governance" },
];

function Logo(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-blue-600 shadow-[0_4px_14px_-4px_rgb(37_99_235/0.7)]">
        <Activity className="h-5 w-5 text-white" aria-hidden />
      </span>
      <span className="font-display text-[17px] font-extrabold tracking-tight">
        EXPERTIUM
      </span>
    </div>
  );
}

function NavList({ pagina, onNav }: { pagina: PageKey; onNav: (p: PageKey) => void }): React.JSX.Element {
  let ultimoGrupo = "";
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const Icono = item.icono;
        const activo = pagina === item.id;
        const cabecera = item.grupo && item.grupo !== ultimoGrupo ? item.grupo : null;
        ultimoGrupo = item.grupo ?? ultimoGrupo;
        return (
          <React.Fragment key={item.id}>
            {cabecera && (
              <p className="mt-4 mb-1 px-3 text-[11px] font-bold tracking-widest text-zinc-500 uppercase first:mt-0 dark:text-zinc-500">
                {cabecera}
              </p>
            )}
            <button
              type="button"
              onClick={() => onNav(item.id)}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70",
                activo
                  ? "bg-blue-600/12 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                  : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100",
              )}
            >
              <Icono className={cn("h-[18px] w-[18px]", activo && "text-blue-600 dark:text-cyan-400")} aria-hidden />
              {item.etiqueta}
              {activo && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden />}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function Shell({
  pagina,
  onNav,
  theme,
  onToggleTheme,
  children,
}: {
  pagina: PageKey;
  onNav: (p: PageKey) => void;
  theme: Theme;
  onToggleTheme: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const [menuAbierto, setMenuAbierto] = React.useState(false);
  const ir = (p: PageKey): void => {
    setMenuAbierto(false);
    onNav(p);
  };

  return (
    <div className="min-h-screen">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-zinc-200 bg-white/80 px-4 py-5 backdrop-blur lg:flex dark:border-white/8 dark:bg-graphite-900/80">
        <div className="px-2">
          <Logo />
        </div>
        <NavList pagina={pagina} onNav={ir} />
        <div className="mt-auto rounded-xl border border-zinc-200 bg-zinc-100/70 p-3.5 dark:border-white/8 dark:bg-white/4">
          <p className="text-xs font-bold">Spark 1.3 · Meta Model API</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {DEMO_MODE ? "Stage 1: frontend with demo data." : "Backend connected."}
          </p>
        </div>
      </aside>

      {/* Drawer móvil/tablet */}
      {menuAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in" onClick={() => setMenuAbierto(false)} role="presentation" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 border-r border-zinc-200 bg-white px-4 py-5 animate-fade-up dark:border-white/10 dark:bg-graphite-900">
            <div className="flex items-center justify-between px-2">
              <Logo />
              <Button variant="ghost" size="icon" onClick={() => setMenuAbierto(false)} aria-label="Close menu">
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </div>
            <NavList pagina={pagina} onNav={ir} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-white/8 dark:bg-graphite-950/80">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuAbierto(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
            <div className="relative hidden flex-1 sm:block">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
              <input
                type="search"
                placeholder="Search processes, CAPAs, documents… (demo)"
                aria-label="Search"
                className="h-9.5 w-full max-w-md rounded-lg border border-zinc-300 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 dark:border-white/10 dark:bg-graphite-850 dark:placeholder:text-zinc-500"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              {DEMO_MODE && <Badge tone="cyan">Demo mode</Badge>}
              <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
              </Button>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white" title="M. Ferrer — Quality owner">
                MF
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
