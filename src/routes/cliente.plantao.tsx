import { carregarStatus, motoristaAtivo } from "@/lib/status-motorista";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Clock, MapPin, Plus, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_PASSAGEIROS,
  formatarBRL,
  modalidades,
  motoristas,
} from "@/lib/dados";
import { carregarAgenda, chaveData } from "@/lib/disponibilidade";
import { salvarJornada } from "@/lib/plantao";
import {
  ANTECEDENCIA_EMBARQUE_MIN,
  BACKUP_LIMITE_MIN,
  CHECKIN_ANTECEDENCIA_MIN,
  DESCONTO_JORNADA,
  ESCALAS,
  PONTOS_ACESSO,
  alocarJornada,
  calcularJornada,
  gerarDiasDaEscala,
  horarioMenos,
  type EscalaId,
  type PontoAcesso,
  type TrechoPlantao,
} from "@/lib/plantao";

export const Route = createFileRoute("/cliente/plantao")({
  head: () => ({
    meta: [
      { title: "Rota de plantonista — seuchauffeur" },
      {
        name: "description",
        content:
          "Monte a jornada de plantão com vários trechos, escolha a escala do mês e garanta motorista titular e de backup em cada horário.",
      },
      { property: "og:title", content: "Rota de plantonista — seuchauffeur" },
      {
        property: "og:description",
        content: "Trechos de ida, troca de plantão e retorno com motorista garantido em cada horário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RotaPlantonista,
});

const TAXA_SERVICO = 8;
const MODALIDADE = "Rota de plantonista";

const dataCurta = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const dataLonga = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });

const TRECHOS_INICIAIS: TrechoPlantao[] = [
  {
    id: 1,
    rotulo: "Início do plantão",
    origem: "Residência — Camaçari",
    destino: "Hospital Teresa de Lisieux — Camaçari",
    horario: "06:15",
    entradaPlantao: "07:00",
    acesso: "Portaria do corpo clínico",
    distancia: 12,
  },
  {
    id: 2,
    rotulo: "2º plantão",
    origem: "Hospital Teresa de Lisieux — Camaçari",
    destino: "Hospital Geral — Salvador",
    horario: "12:15",
    entradaPlantao: "13:00",
    acesso: "Entrada da emergência",
    distancia: 42,
  },
  {
    id: 3,
    rotulo: "Retorno pós-plantão",
    origem: "Hospital Geral — Salvador",
    destino: "Residência — Camaçari",
    horario: "19:15",
    entradaPlantao: "",
    acesso: "Residência do cliente",
    distancia: 45,
  },
];

function RotaPlantonista() {
  const navegar = useNavigate();
  const modalidade = modalidades.find((m) => m.nome === MODALIDADE) ?? modalidades[0]!;

  const [dia, setDia] = useState<Date>(new Date());
  const [escala, setEscala] = useState<EscalaId>("avulso");
  const [trechos, setTrechos] = useState<TrechoPlantao[]>(TRECHOS_INICIAIS);
  const [manterMesmo, setManterMesmo] = useState(true);
  const [preferido, setPreferido] = useState<string | null>(null);

  const agenda = useMemo(() => carregarAgenda(), []);
  const candidatos = useMemo(
    () =>
      motoristas
        .filter((m) => (CATEGORIAS_PASSAGEIROS as readonly string[]).includes(m.categoria))
        .filter((m) => motoristaAtivo(carregarStatus(), m.nome))
        .map((m) => m.nome),
    [],
  );

  const diasEscala = useMemo(() => gerarDiasDaEscala(dia, escala), [dia, escala]);
  const resumo = useMemo(
    () => calcularJornada(trechos, modalidade.valorPorKm, diasEscala.length, TAXA_SERVICO),
    [trechos, modalidade.valorPorKm, diasEscala.length],
  );
  const alocacao = useMemo(
    () => alocarJornada(trechos, candidatos, agenda, dia, preferido, manterMesmo),
    [trechos, candidatos, agenda, dia, preferido, manterMesmo],
  );
  const semCobertura = alocacao.filter((a) => !a.motorista).length;

  const atualizar = (id: number, campo: keyof TrechoPlantao, valor: string | number) =>
    setTrechos((atuais) => atuais.map((t) => (t.id === id ? { ...t, [campo]: valor } : t)));

  const adicionar = () =>
    setTrechos((atuais) => [
      ...atuais,
      {
        id: Date.now(),
        rotulo: `Trecho ${atuais.length + 1}`,
        origem: atuais.at(-1)?.destino ?? "",
        destino: "",
        horario: "20:00",
        entradaPlantao: "",
        acesso: "Recepção geral",
        distancia: 15,
      },
    ]);

  const remover = (id: number) =>
    setTrechos((atuais) => (atuais.length > 1 ? atuais.filter((t) => t.id !== id) : atuais));

  const confirmar = () => {
    if (trechos.some((t) => !t.origem.trim() || !t.destino.trim())) {
      toast.error("Informe a origem e o destino de todos os trechos da jornada.");
      return;
    }
    if (semCobertura > 0) {
      toast.error("Há trecho sem motorista disponível. Ajuste o horário ou escolha outro dia.");
      return;
    }
    salvarJornada({
      id: `PL-${Date.now().toString().slice(-5)}`,
      cliente: "Adeilton Oliveira",
      dias: diasEscala.map(chaveData),
      totalPorDia: resumo.porDia,
      trechos: trechos.map((t) => {
        const a = alocacao.find((x) => x.trechoId === t.id);
        return { rotulo: t.rotulo, origem: t.origem, destino: t.destino, horario: t.horario, acesso: t.acesso, distancia: t.distancia, motorista: a?.motorista ?? null, backup: a?.backup ?? null };
      }),
    });
    toast.success(
      `Jornada de plantão agendada: ${trechos.length} trechos em ${diasEscala.length} dia(s) — ${formatarBRL(resumo.total)}.`,
    );
    navegar({ to: "/cliente/pagamento" });
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <AppShell
      titulo="Rota de plantonista"
      descricao="Monte os trechos do seu plantão, escolha a escala do mês e garanta um motorista para cada horário."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-medium">
              <CalendarDays className="size-4 text-primary" /> Dia do plantão e escala
            </h2>
            <div className="mt-4 grid gap-5 md:grid-cols-[auto_1fr]">
              <Calendar
                mode="single"
                selected={dia}
                onSelect={(d) => d && setDia(d)}
                disabled={{ before: hoje }}
                className="rounded-xl border border-border/70"
              />
              <div className="space-y-3">
                <Label>Repetir a jornada conforme a escala</Label>
                <div className="flex flex-wrap gap-2">
                  {ESCALAS.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setEscala(e.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        escala === e.id
                          ? "border-primary bg-secondary text-foreground"
                          : "border-border/70 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {e.rotulo}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  A partir de {dataLonga(dia)}, a mesma rota será aplicada em{" "}
                  <span className="text-gold">{diasEscala.length} dia(s)</span>:{" "}
                  {diasEscala.map(dataCurta).join(" · ")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-medium">
                <MapPin className="size-4 text-primary" /> Trechos da jornada
              </h2>
              <Button variant="outline" size="sm" onClick={adicionar}>
                <Plus className="size-4" /> Adicionar trecho
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {trechos.map((t, i) => (
                <div key={t.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Input
                      value={t.rotulo}
                      onChange={(e) => atualizar(t.id, "rotulo", e.target.value)}
                      className="max-w-56 font-medium"
                    />
                    <span className="text-xs text-muted-foreground">Trecho {i + 1}</span>
                    {trechos.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => remover(t.id)} aria-label="Remover trecho">
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Origem</Label>
                      <Input value={t.origem} onChange={(e) => atualizar(t.id, "origem", e.target.value)} />
                    </div>
                    <div>
                      <Label>Destino</Label>
                      <Input value={t.destino} onChange={(e) => atualizar(t.id, "destino", e.target.value)} />
                    </div>
                    <div>
                      <Label>Horário de embarque</Label>
                      <Input
                        type="time"
                        value={t.horario}
                        onChange={(e) => atualizar(t.id, "horario", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Entrada no plantão (opcional)</Label>
                      <Input
                        type="time"
                        value={t.entradaPlantao}
                        onChange={(e) => atualizar(t.id, "entradaPlantao", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Distância estimada (km)</Label>
                      <Input
                        type="number"
                        min={1}
                        step="0.1"
                        value={t.distancia}
                        onChange={(e) => atualizar(t.id, "distancia", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Ponto de acesso</Label>
                      <select
                        value={t.acesso}
                        onChange={(e) => atualizar(t.id, "acesso", e.target.value as PontoAcesso)}
                        className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-3 text-sm"
                      >
                        {PONTOS_ACESSO.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    O motorista aguarda em {t.acesso.toLowerCase()} a partir de{" "}
                    {horarioMenos(t.horario, ANTECEDENCIA_EMBARQUE_MIN)} e confirma prontidão às{" "}
                    {horarioMenos(t.horario, CHECKIN_ANTECEDENCIA_MIN)}.
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-medium">
              <UserCheck className="size-4 text-primary" /> Condutores da jornada
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setManterMesmo(true)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  manterMesmo ? "border-primary bg-secondary" : "border-border/70 text-muted-foreground",
                )}
              >
                Manter o mesmo motorista se disponível
              </button>
              <button
                type="button"
                onClick={() => setManterMesmo(false)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  !manterMesmo ? "border-primary bg-secondary" : "border-border/70 text-muted-foreground",
                )}
              >
                Permitir motoristas diferentes por trecho
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <Label>Motorista preferido (opcional)</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreferido(null)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    preferido === null ? "border-primary bg-secondary" : "border-border/70 text-muted-foreground",
                  )}
                >
                  Automático
                </button>
                {candidatos.map((nome) => (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => setPreferido(nome)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm",
                      preferido === nome ? "border-primary bg-secondary" : "border-border/70 text-muted-foreground",
                    )}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {alocacao.map((a) => {
                const trecho = trechos.find((t) => t.id === a.trechoId)!;
                return (
                  <div
                    key={a.trechoId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2"
                  >
                    <span className="text-muted-foreground">
                      {trecho.horario} · {trecho.rotulo}
                    </span>
                    <span>
                      {a.motorista ? (
                        <>
                          <span className="text-gold">{a.motorista}</span>
                          {a.dedicado ? " · jornada completa" : ""}
                          {a.backup ? ` · backup: ${a.backup}` : " · sem backup neste horário"}
                        </>
                      ) : (
                        <span className="text-destructive">Nenhum motorista disponível neste horário</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-primary/30 bg-secondary/40 p-4 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <ShieldCheck className="size-4 text-primary" /> Garantia de atendimento
              </p>
              <p className="mt-2 text-muted-foreground">
                O motorista confirma prontidão {CHECKIN_ANTECEDENCIA_MIN} minutos antes de cada trecho. Sem confirmação
                até {BACKUP_LIMITE_MIN} minutos antes do embarque, a plataforma aciona o motorista de backup mais
                próximo da mesma categoria e avisa você por WhatsApp e no aplicativo.
              </p>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="surface-luxe p-5">
            <h2 className="flex items-center gap-2 font-medium">
              <Clock className="size-4 text-primary" /> Resumo da jornada
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{dataLonga(dia)}</p>

            <div className="mt-4 space-y-2 text-sm">
              {trechos.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t.horario} · {t.rotulo}
                    <br />
                    <span className="text-xs">
                      {t.origem} → {t.destino}
                    </span>
                  </span>
                  <span>{t.distancia} km</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-border/70 pt-4 text-sm">
              <div className="flex justify-between">
                <span>
                  Trajeto {resumo.kmTotal} km × {formatarBRL(modalidade.valorPorKm)}
                </span>
                <span>{formatarBRL(resumo.bruto)}</span>
              </div>
              {resumo.desconto > 0 && (
                <div className="flex justify-between text-gold">
                  <span>Desconto de jornada ({DESCONTO_JORNADA * 100}%)</span>
                  <span>− {formatarBRL(resumo.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Taxa de serviço</span>
                <span>{formatarBRL(TAXA_SERVICO)}</span>
              </div>
              <div className="flex justify-between">
                <span>Valor por dia de plantão</span>
                <span>{formatarBRL(resumo.porDia)}</span>
              </div>
              <div className="flex justify-between border-t border-border/70 pt-2 text-base font-medium">
                <span>Total ({resumo.dias} dia(s))</span>
                <span className="text-gold">{formatarBRL(resumo.total)}</span>
              </div>
            </div>

            <Button className="mt-5 w-full" onClick={confirmar}>
              Confirmar jornada e pagar
            </Button>
          </Card>

          <Card className="p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Como proceder</p>
            <p className="mt-2 leading-relaxed">{modalidade.caracteristicas}</p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
