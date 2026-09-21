import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Car, Search, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  agendamentos,
  participantesMapa,
  rotuloStatus,
  type StatusAgendamento,
} from "@/lib/dados";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa de agendamentos — seuchauffeur" },
      { name: "description", content: "Veja motoristas e clientes conectados no mapa e seus agendamentos ativos." },
      { property: "og:title", content: "Mapa de agendamentos — seuchauffeur" },
      { property: "og:description", content: "Localização em tempo real, filtros de status e busca por nome." },
    ],
  }),
  component: Mapa,
});

const statusFiltro: (StatusAgendamento | "todos")[] = ["todos", "pendente", "confirmado", "em-andamento"];

function Mapa() {
  const [filtro, setFiltro] = useState<StatusAgendamento | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [destacado, setDestacado] = useState<string | null>("AG-1042");

  const visiveis = agendamentos.filter(
    (a) => (filtro === "todos" ? a.status !== "concluido" && a.status !== "cancelado" : a.status === filtro),
  );
  const idsVisiveis = visiveis.map((a) => a.id);

  const marcadores = participantesMapa.filter(
    (p) =>
      idsVisiveis.includes(p.agendamento) &&
      (busca.trim() === "" || p.nome.toLowerCase().includes(busca.trim().toLowerCase())),
  );

  return (
    <AppShell titulo="Mapa de agendamentos" descricao="Motoristas e clientes conectados, com seus agendamentos ativos.">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar motorista ou cliente"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {statusFiltro.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFiltro(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    filtro === s
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {s === "todos" ? "Todos" : rotuloStatus[s]}
                </button>
              ))}
            </div>
          </div>

          <Card className="surface-luxe relative h-[440px] overflow-hidden border-border/60">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
            {marcadores.map((p) => {
              const ativo = destacado === p.agendamento;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDestacado(p.agendamento)}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border p-2 transition-transform ${
                    p.tipo === "motorista"
                      ? "border-primary/50 bg-primary/20 text-primary"
                      : "border-accent/50 bg-accent/20 text-accent"
                  } ${ativo ? "scale-125 glow-gold" : ""}`}
                  title={p.nome}
                >
                  {p.tipo === "motorista" ? <Car className="size-4" /> : <UserRound className="size-4" />}
                </button>
              );
            })}
            <div className="absolute bottom-4 left-4 rounded-lg border border-border/70 bg-card/90 p-3 text-xs backdrop-blur">
              <p className="mb-2 font-medium uppercase tracking-wide text-muted-foreground">Legenda</p>
              <p className="flex items-center gap-2 text-primary">
                <Car className="size-3.5" /> Motorista
              </p>
              <p className="mt-1 flex items-center gap-2 text-accent">
                <UserRound className="size-3.5" /> Cliente
              </p>
            </div>
          </Card>
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Agendamentos ativos</h2>
          {visiveis.map((a) => (
            <button key={a.id} type="button" onClick={() => setDestacado(a.id)} className="w-full text-left">
              <Card
                className={`border-border/60 p-4 transition-colors ${
                  destacado === a.id ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold">{a.id}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {a.cliente} · {a.motorista}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.ida} — {a.desembarque}
                </p>
              </Card>
            </button>
          ))}
          {visiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento neste filtro.</p>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}
