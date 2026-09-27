import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, CircleOff, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MOTORISTA_ATUAL,
  carregarAgenda,
  salvarAgenda,
  type RegistroDia,
  type StatusDia,
} from "@/lib/disponibilidade";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/motorista/disponibilidade")({
  head: () => ({
    meta: [
      { title: "Disponibilidade — seuchauffeur" },
      { name: "description", content: "Marque no calendário os dias e horários em que você está disponível ou indisponível." },
      { property: "og:title", content: "Disponibilidade — seuchauffeur" },
      { property: "og:description", content: "Calendário do motorista para definir dias e horários disponíveis." },
    ],
  }),
  component: DisponibilidadeMotorista,
});

const atalhosHorario = ["06:00", "07:30", "09:00", "12:00", "14:00", "18:00", "20:00"];

function chaveData(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function rotuloData(chave: string) {
  const [ano, mes, dia] = chave.split("-");
  return `${dia}/${mes}/${ano}`;
}

const nomesMeses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function DisponibilidadeMotorista() {
  const hoje = useMemo(() => new Date(), []);
  const [mesVisivel, setMesVisivel] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [registros, setRegistros] = useState<Record<string, RegistroDia>>(
    () => carregarAgenda()[MOTORISTA_ATUAL] ?? {},
  );

  const [status, setStatus] = useState<StatusDia>("disponivel");
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("18:00");

  const ano = mesVisivel.getFullYear();
  const mes = mesVisivel.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const chaveHoje = chaveData(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const persistir = (novos: Record<string, RegistroDia>) => {
    setRegistros(novos);
    const agenda = carregarAgenda();
    agenda[MOTORISTA_ATUAL] = novos;
    salvarAgenda(agenda);
  };

  const selecionarDia = (chave: string) => {
    setDiaSelecionado(chave);
    const registro = registros[chave];
    if (registro) {
      setStatus(registro.status);
      setInicio(registro.inicio);
      setFim(registro.fim);
    } else {
      setStatus("disponivel");
      setInicio("08:00");
      setFim("18:00");
    }
  };

  const salvarDia = () => {
    if (!diaSelecionado) return;
    if (inicio >= fim) {
      toast.error("O horário de início precisa ser anterior ao horário de fim.");
      return;
    }
    persistir({ ...registros, [diaSelecionado]: { status, inicio, fim } });
    toast.success(
      status === "disponivel"
        ? `Disponível em ${rotuloData(diaSelecionado)} das ${inicio} às ${fim}.`
        : `Indisponível em ${rotuloData(diaSelecionado)} das ${inicio} às ${fim}.`,
    );
  };

  const limparDia = () => {
    if (!diaSelecionado) return;
    const copia = { ...registros };
    delete copia[diaSelecionado];
    persistir(copia);
    toast("Dia limpo: você voltará a receber corridas conforme sua disponibilidade geral.");
  };

  const diasMarcados = Object.entries(registros).sort(([a], [b]) => a.localeCompare(b));

  return (
    <AppShell
      titulo="Disponibilidade"
      descricao="Escolha no calendário os dias e horários em que você pode receber corridas. Dias indisponíveis não aparecem para os clientes."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="surface-luxe border-border/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <CalendarDays className="size-5 text-gold" /> {nomesMeses[mes]} de {ano}
            </h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMesVisivel(new Date(ano, mes - 1, 1))}>
                ← Anterior
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setMesVisivel(new Date(ano, mes + 1, 1))}>
                Próximo →
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wide text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
              <div key={`vazio-${i}`} />
            ))}
            {Array.from({ length: diasNoMes }).map((_, i) => {
              const dia = i + 1;
              const chave = chaveData(ano, mes, dia);
              const registro = registros[chave];
              const passado = chave < chaveHoje;
              return (
                <button
                  key={chave}
                  type="button"
                  disabled={passado}
                  onClick={() => selecionarDia(chave)}
                  className={cn(
                    "flex h-12 flex-col items-center justify-center rounded-lg border border-transparent text-sm transition-colors",
                    passado && "cursor-not-allowed opacity-30",
                    diaSelecionado === chave && "border-primary glow-gold",
                    registro?.status === "disponivel" && "bg-emerald-500/15 text-emerald-300",
                    registro?.status === "indisponivel" && "bg-destructive/15 text-destructive",
                    !passado && !registro && "hover:bg-secondary",
                  )}
                >
                  <span>{dia}</span>
                  {registro ? (
                    <span className="text-[10px] leading-tight">
                      {registro.status === "disponivel" ? `${registro.inicio}–${registro.fim}` : "folga"}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-400" /> Disponível
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-destructive" /> Indisponível
            </span>
          </div>
        </Card>

        <aside className="space-y-6">
          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {diaSelecionado ? `Dia ${rotuloData(diaSelecionado)}` : "Selecione um dia no calendário"}
            </h2>

            {diaSelecionado ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-4 py-3">
                  <Label htmlFor="status-dia" className="flex items-center gap-2 text-sm">
                    {status === "disponivel" ? (
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    ) : (
                      <CircleOff className="size-4 text-destructive" />
                    )}
                    {status === "disponivel" ? "Disponível" : "Indisponível"}
                  </Label>
                  <Switch
                    id="status-dia"
                    checked={status === "disponivel"}
                    onCheckedChange={(v) => setStatus(v ? "disponivel" : "indisponivel")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="hora-inicio">Das</Label>
                    <Input id="hora-inicio" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hora-fim">Até</Label>
                    <Input id="hora-fim" type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {atalhosHorario.map((h) => (
                    <Button key={h} type="button" variant="secondary" size="sm" onClick={() => setInicio(h)}>
                      {h}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={salvarDia}>
                    <Save /> Salvar dia
                  </Button>
                  {registros[diaSelecionado] ? (
                    <Button variant="secondary" onClick={limparDia}>
                      Limpar
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Toque em um dia para marcar se você estará disponível e em qual faixa de horário.
              </p>
            )}
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Próximos dias marcados</h2>
            <div className="mt-3 space-y-2">
              {diasMarcados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dia marcado ainda.</p>
              ) : (
                diasMarcados.map(([chave, r]) => (
                  <div key={chave} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                    <span>{rotuloData(chave)}</span>
                    <Badge variant={r.status === "disponivel" ? "default" : "destructive"}>
                      {r.status === "disponivel" ? `${r.inicio}–${r.fim}` : "Indisponível"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
