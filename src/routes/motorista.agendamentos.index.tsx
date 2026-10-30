import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, HeartPulse, BellRing } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatarBRL } from "@/lib/dados";
import { useCorridas } from "@/lib/corridas";
import { useMotoristaLogado } from "@/lib/motorista-sessao";
import { OportunidadesMotorista } from "@/components/agendamentos-abertos";
import { MOTORISTA_ATUAL } from "@/lib/disponibilidade";
import {
  BACKUP_LIMITE_MIN,
  CHECKIN_ANTECEDENCIA_MIN,
  carregarJornadas,
  horarioMenos,
  type JornadaReservada,
} from "@/lib/plantao";

export const Route = createFileRoute("/motorista/agendamentos/")({
  head: () => ({
    meta: [
      { title: "Agendamentos disponíveis — seuchauffeur" },
      { name: "description", content: "Avalie as corridas agendadas disponíveis e confirme seu interesse." },
      { property: "og:title", content: "Agendamentos disponíveis — seuchauffeur" },
      { property: "og:description", content: "Disponibilidade, filtro por data e lista de corridas agendadas." },
    ],
  }),
  component: AgendamentosMotorista,
});

function AgendamentosMotorista() {
  const [disponivel, setDisponivel] = useState(true);
  const [data, setData] = useState("");
  const [jornadas, setJornadas] = useState<JornadaReservada[]>([]);
  useEffect(() => setJornadas(carregarJornadas()), []);

  const plantoes = jornadas.flatMap((j) =>
    j.dias
      .filter((d) => data === "" || d === data)
      .flatMap((d) =>
        j.trechos
          .filter((t) => t.motorista === MOTORISTA_ATUAL || t.backup === MOTORISTA_ATUAL)
          .map((t) => ({ j, d, t, papel: t.motorista === MOTORISTA_ATUAL ? "Titular" : "Backup" })),
      ),
  ).sort((a, b) => (a.d + a.t.horario).localeCompare(b.d + b.t.horario));

  const { carregando, motorista } = useMotoristaLogado();
  const corridas = useCorridas({ motorista: motorista?.nome ?? "" , cliente: motorista ? undefined : "" });
  const lista = corridas.filter(
    (a) => a.status !== "cancelado" && (data === "" || a.ida.includes(formatarData(data)) || a.ida.startsWith(data)),
  );

  return (
    <AppShell
      titulo="Agendamentos"
      descricao="O veículo do agendamento só pode ser alterado com a aceitação do cliente."
      acao={
        <div className="flex items-center gap-3 rounded-full border border-border/70 bg-secondary/50 px-4 py-2">
          <Label htmlFor="disponivel" className="text-sm">
            {disponivel ? "Disponível" : "Indisponível"}
          </Label>
          <Switch id="disponivel" checked={disponivel} onCheckedChange={setDisponivel} />
        </div>
      }
    >
      <div className="mb-5 max-w-xs space-y-2">
        <Label htmlFor="filtro-data">Filtrar por data</Label>
        <Input id="filtro-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <OportunidadesMotorista />

      {plantoes.length > 0 ? (
        <div className="mb-6 space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <HeartPulse className="size-5 text-gold" /> Plantões ({plantoes.length})
          </h2>
          {plantoes.map(({ j, d, t, papel }, i) => (
            <Card key={`${j.id}-${d}-${i}`} className="surface-luxe border-border/60 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-base font-semibold">
                  {formatarData(d)} {t.horario}
                </span>
                <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs text-gold">{papel}</span>
                <span className="text-xs text-muted-foreground">{j.id} · {t.rotulo}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.origem} → {t.destino}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {j.cliente} · Rota de plantonista · ponto de encontro: {t.acesso} · {t.distancia} km
              </p>
              <div className="mt-3 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs">
                <BellRing className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>
                  {papel === "Titular"
                    ? `Confirme sua prontidão às ${horarioMenos(t.horario, CHECKIN_ANTECEDENCIA_MIN)} (${CHECKIN_ANTECEDENCIA_MIN} min antes). Sem confirmação até ${horarioMenos(t.horario, BACKUP_LIMITE_MIN)}, o backup${t.backup ? ` (${t.backup})` : ""} assume o trecho.`
                    : `Você é o backup de ${t.motorista ?? "—"}. Fique de prontidão: se o titular não confirmar até ${horarioMenos(t.horario, BACKUP_LIMITE_MIN)}, este trecho passa para você.`}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {lista.map((a) => (
          <Link key={a.id} to="/motorista/agendamentos/$id" params={{ id: a.id }}>
            <Card className="surface-luxe flex items-center justify-between gap-4 border-border/60 p-5 transition-transform hover:-translate-y-0.5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-base font-semibold">{a.ida}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {a.embarque} → {a.desembarque}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.cliente} · {a.modalidade} · {a.veiculo} · {formatarBRL(a.valor)}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma corrida agendada nesta data.</p>
        ) : null}
      </div>
    </AppShell>
  );
}

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
