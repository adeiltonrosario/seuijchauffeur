import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useMemo, useRef, useState } from "react";
import type { PontoMapa } from "@/components/mapa-real";

const MapaReal = lazy(() => import("@/components/mapa-real"));
import {
  Car,
  Crosshair,
  Layers,
  Minus,
  Navigation,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MapaRuas } from "@/components/mapa-ruas";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Mapa,
});

const statusFiltro: (StatusAgendamento | "todos")[] = ["todos", "pendente", "confirmado", "em-andamento"];

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.6;

function Mapa() {
  const [filtro, setFiltro] = useState<StatusAgendamento | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [destacado, setDestacado] = useState<string | null>("AG-1042");
  const [zoom, setZoom] = useState(1.15);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [satelite, setSatelite] = useState(false);
  const arraste = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const visiveis = agendamentos.filter(
    (a) => (filtro === "todos" ? a.status !== "concluido" && a.status !== "cancelado" : a.status === filtro),
  );
  const idsVisiveis = visiveis.map((a) => a.id);

  const marcadores = participantesMapa.filter(
    (p) =>
      idsVisiveis.includes(p.agendamento) &&
      (busca.trim() === "" || p.nome.toLowerCase().includes(busca.trim().toLowerCase())),
  );

  const [versaoCentro, setVersaoCentro] = useState(0);
  const [rotaReal, setRotaReal] = useState<{ km: number; minutos: number } | null>(null);
  void satelite;
  void setSatelite;
  void arraste;
  void pan;
  void setPan;

  const pontosReais = useMemo<PontoMapa[]>(
    () =>
      marcadores.map((p) => ({
        id: p.id,
        nome: p.nome,
        tipo: p.tipo,
        grupo: p.agendamento,
        // converte a posição ilustrativa (%) para coordenadas reais em Salvador/RMS
        lat: -12.86 - (p.y / 100) * 0.2,
        lng: -38.56 + (p.x / 100) * 0.26,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(marcadores.map((m) => m.id))],
  );

  const rota = rotaReal;
  const minutos = rotaReal?.minutos ?? 0;

  const ajustarZoom = (delta: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)));

  const recentralizar = () => {
    setZoom(1.15);
    setVersaoCentro((v) => v + 1);
  };

  return (
    <AppShell titulo="Mapa de agendamentos" descricao="Motoristas e clientes conectados, com seus agendamentos ativos.">
      <Card className="relative h-[clamp(520px,72vh,760px)] overflow-hidden border-border/60 p-0">
        <ClientOnly fallback={<div className="absolute inset-0 bg-card" />}>
          <Suspense fallback={<div className="absolute inset-0 bg-card" />}>
            <MapaReal
              pontos={pontosReais}
              destacado={destacado}
              onSelecionar={setDestacado}
              zoom={zoom}
              versaoCentro={versaoCentro}
              onRota={setRotaReal}
            />
          </Suspense>
        </ClientOnly>

        {/* Busca flutuante + filtros */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 sm:p-4">
          <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar motorista ou cliente"
                className="h-12 rounded-full border-border/70 bg-card/95 pl-10 pr-10 shadow-xl backdrop-blur"
              />
              {busca ? (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {statusFiltro.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFiltro(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur transition-colors ${
                    filtro === s
                      ? "border-primary/60 bg-primary/20 text-primary"
                      : "border-border/70 bg-card/90 text-muted-foreground"
                  }`}
                >
                  {s === "todos" ? "Todos" : rotuloStatus[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Controles laterais */}
        <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 sm:right-4">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-xl backdrop-blur">
            <button
              type="button"
              onClick={() => ajustarZoom(0.3)}
              className="flex size-10 items-center justify-center border-b border-border/70 text-foreground"
              aria-label="Aproximar"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => ajustarZoom(-0.3)}
              className="flex size-10 items-center justify-center text-foreground"
              aria-label="Afastar"
            >
              <Minus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={recentralizar}
            className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-card/95 text-primary shadow-xl backdrop-blur"
            aria-label="Centralizar mapa"
          >
            <Crosshair className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setSatelite((s) => !s)}
            className={`flex size-10 items-center justify-center rounded-xl border shadow-xl backdrop-blur ${
              satelite ? "border-primary/60 bg-primary/20 text-primary" : "border-border/70 bg-card/95 text-foreground"
            }`}
            aria-label="Alternar camada de relevo"
          >
            <Layers className="size-4" />
          </button>
        </div>

        {/* Legenda */}
        <div className="absolute bottom-3 right-3 z-10 hidden rounded-lg border border-border/70 bg-card/90 p-3 text-xs shadow-xl backdrop-blur sm:block">
          <p className="mb-2 font-medium uppercase tracking-wide text-muted-foreground">Legenda</p>
          <p className="flex items-center gap-2 text-primary">
            <Car className="size-3.5" /> Motorista
          </p>
          <p className="mt-1 flex items-center gap-2 text-accent">
            <UserRound className="size-3.5" /> Cliente
          </p>
        </div>

        {/* Painel inferior com a corrida selecionada e a lista de ativos */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4">
          <div className="mx-auto max-w-3xl space-y-2">
            {corrida ? (
              <Card className="border-border/70 bg-card/95 p-4 shadow-2xl backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Navigation className="size-4" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-semibold">{corrida.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {corrida.cliente} · {corrida.motorista}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={corrida.status} />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                      {corrida.embarque}
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="mt-1 size-2 shrink-0 rounded-sm bg-accent" />
                      {corrida.desembarque}
                    </p>
                  </div>
                  {rota ? (
                    <p className="text-right">
                      <span className="font-display text-xl font-semibold text-primary">{minutos} min</span>
                      <span className="block text-xs text-muted-foreground">
                        {rota.km.toLocaleString("pt-BR")} km até o cliente
                      </span>
                    </p>
                  ) : null}
                </div>
              </Card>
            ) : null}

            <div className="flex gap-2 overflow-x-auto pb-1">
              {visiveis.map((a) => (
                <Button
                  key={a.id}
                  type="button"
                  variant="outline"
                  onClick={() => setDestacado(a.id)}
                  className={`h-auto shrink-0 flex-col items-start gap-0.5 rounded-xl border-border/70 bg-card/95 px-3 py-2 text-left shadow-lg backdrop-blur ${
                    destacado === a.id ? "border-primary/60 text-primary" : ""
                  }`}
                >
                  <span className="font-display text-xs font-semibold">{a.id}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">{a.cliente}</span>
                </Button>
              ))}
              {visiveis.length === 0 ? (
                <p className="rounded-xl border border-border/70 bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
                  Nenhum agendamento neste filtro.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
