import type * as React from "react";
import { useState } from "react";
import { API_URL, DEMO_MODE, getSimularFallo, setSimularFallo } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { FieldLabel, Input, Switch } from "@/components/ui/forms";
import { PageHeader } from "@/components/ui/stat";
import type { Theme } from "@/hooks/useTheme";

export function Settings({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }): React.JSX.Element {
  const agentes = useApi(api.agentes);
  const [fallo, setFallo] = useState(getSimularFallo());
  const [activos, setActivos] = useState<Record<string, boolean>>({});

  const estaActivo = (id: string, defecto: boolean): boolean => activos[id] ?? defecto;

  return (
    <div className="animate-fade-up">
      <PageHeader
        titulo="Settings"
        descripcion="Backend connection, agents, appearance and demo tools."
        acciones={<DemoBadge />}
      />

      <div className="grid max-w-4xl gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>FastAPI backend</CardTitle>
              <CardDescription>
                {DEMO_MODE
                  ? "Stage 1: no backend connected; everything is served from local demo data."
                  : "Backend connected: data is real (SQLite + Spark agents)."}
              </CardDescription>
            </div>
            <Badge tone={DEMO_MODE ? "cyan" : "success"}>{DEMO_MODE ? "Demo" : "Connected"}</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="set-url">API URL</FieldLabel>
              <Input id="set-url" defaultValue={API_URL} disabled title="Used when VITE_DEMO_MODE=false" />
            </div>
            <div>
              <FieldLabel htmlFor="set-model">Model</FieldLabel>
              <Input id="set-model" defaultValue="muse-spark-1.3" disabled />
            </div>
            <p className="text-xs text-zinc-500 sm:col-span-2">
              To connect the real backend: edit <code className="font-mono">frontend/.env</code> with
              the URL and set <code className="font-mono">VITE_DEMO_MODE=false</code>. See{" "}
              <code className="font-mono">docs/API_CONTRACT.md</code>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Agents</CardTitle>
              <CardDescription>Enable or pause each flow agent.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {agentes.estado === "loading" && <LoadingBlock />}
            {agentes.estado === "error" && <ErrorBlock mensaje={agentes.error ?? ""} onRetry={agentes.recargar} />}
            {agentes.estado === "success" && (
              <ul className="flex flex-col gap-3">
                {agentes.datos?.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-white/8">
                    <Switch
                      checked={estaActivo(a.id, a.activo)}
                      onChange={(v) => setActivos((s) => ({ ...s, [a.id]: v }))}
                      label={`Enable agent ${a.nombre}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{a.nombre}</p>
                      <p className="truncate font-mono text-[11px] text-zinc-500">
                        {a.modelo} · effort {a.esfuerzo} · timeout {a.timeoutSeg}s
                      </p>
                    </div>
                    <Badge tone={estaActivo(a.id, a.activo) ? "success" : "neutral"}>
                      {estaActivo(a.id, a.activo) ? "Active" : "Paused"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Interface theme.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{theme === "dark" ? "Graphite dark" : "Light"}</p>
              <Switch checked={theme === "dark"} onChange={onToggleTheme} label="Toggle dark/light theme" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Demo tools</CardTitle>
                <CardDescription>To try the error states.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Simulate network failure</p>
              <Switch
                checked={fallo}
                onChange={(v) => {
                  setFallo(v);
                  setSimularFallo(v);
                }}
                label="Simulate network failure on demo requests"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
