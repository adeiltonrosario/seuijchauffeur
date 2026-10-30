import { createFileRoute, Link } from "@tanstack/react-router";
import { MeusAgendamentosCliente } from "@/components/agendamentos-abertos";
import { useEffect, useState } from "react";
import { CalendarPlus, ChevronRight, Star, Stethoscope, Ticket, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { ConsultorViagemIA } from "@/components/consultor-viagem-ia";
import { BannerPublicidade } from "@/components/banner-publicidade";
import { ClubeIndicacoes } from "@/components/clube-indicacoes";
import { PropostasCliente } from "@/components/propostas-cliente";
import { RotaExclusivaCliente } from "@/components/rota-exclusiva";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { agendamentos, formatarBRL, motoristas } from "@/lib/dados";
import {
  VALIDADE_CREDITOS_DIAS,
  carregarCreditos,
  creditosAVencer,
  diasAteExpirar,
  loteVigente,
  rotuloPeriodicidade,
  saldoDisponivel,
  type LoteCredito,
} from "@/lib/assinaturas";

export const Route = createFileRoute("/cliente/")({
  head: () => ({
    meta: [
      { title: "Meus agendamentos — seuchauffeur" },
      { name: "description", content: "Acompanhe seus próximos agendamentos e agende novas corridas." },
      { property: "og:title", content: "Meus agendamentos — seuchauffeur" },
      { property: "og:description", content: "Próximas corridas, motoristas favoritos e novo agendamento." },
    ],
  }),
  component: InicioCliente,
});

function InicioCliente() {
  const [lotes, setLotes] = useState<LoteCredito[]>([]);
  const [primeiroNome, setPrimeiroNome] = useState("");

  useEffect(() => {
    setLotes(carregarCreditos());
    const nome = localStorage.getItem("seuchauffeur:cliente-nome") ?? "";
    setPrimeiroNome(nome.trim().split(/\s+/)[0] ?? "");
  }, []);

  const saldo = saldoDisponivel(lotes);
  const aVencer = creditosAVencer(lotes, 30);
  const vigentes = lotes
    .filter((l) => loteVigente(l))
    .sort((a, b) => a.dataExpiracao.localeCompare(b.dataExpiracao));

  return (
    <AppShell
      titulo={primeiroNome ? `Olá, ${primeiroNome}` : "Olá!"}
      descricao="Seus próximos trajetos e acesso rápido a um novo agendamento."
      acao={
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/cliente/agendamento/novo">
              <CalendarPlus /> Agendar corrida
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/favoritos">
              <UserRound /> Perfil
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <MeusAgendamentosCliente />
          <RotaExclusivaCliente />
          <PropostasCliente />
          <ConsultorViagemIA />
          <BannerPublicidade publico="clientes" />
          <ClubeIndicacoes />

          <Card className="surface-luxe border-primary/30 p-5">
            <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              <Stethoscope className="size-4 text-primary" /> É profissional de plantão?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Monte sua escala com os trechos do dia: ida ao plantão, troca de hospital e retorno para casa.
            </p>
            <Button variant="secondary" className="mt-3" asChild>
              <Link to="/cliente/plantao">Montar minha escala</Link>
            </Button>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="surface-luxe border-border/60 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Créditos do plano
              </h2>
              <Ticket className="size-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-3xl text-gold">{saldo}</p>
            <p className="text-xs text-muted-foreground">
              {saldo === 1 ? "viagem disponível" : "viagens disponíveis"} · validade de {VALIDADE_CREDITOS_DIAS} dias
            </p>
            {aVencer > 0 ? (
              <p className="mt-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                {aVencer} {aVencer === 1 ? "crédito vence" : "créditos vencem"} nos próximos 30 dias.
              </p>
            ) : null}
            {vigentes.length ? (
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                {vigentes.slice(0, 4).map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span>
                      {l.creditosRestantes} de {l.creditosDisponibilizados} · plano{" "}
                      {rotuloPeriodicidade[l.origem].toLowerCase()}
                    </span>
                    <span className="text-foreground">vence em {diasAteExpirar(l.dataExpiracao)}d</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">
                  Você ainda não tem um plano ativo. Fale com a nossa equipe para receber uma proposta personalizada.
                </p>
              </div>
            )}
          </Card>

          <Card className="border-border/60 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Favoritos</h2>
              <Link to="/favoritos" className="text-xs text-primary">
                ver todos
              </Link>
            </div>
            {motoristas.filter((m) => m.favorito).length === 0 && (
              <p className="mt-4 text-xs text-muted-foreground">Nenhum motorista favorito ainda.</p>
            )}
            <ul className="mt-4 space-y-4">
              {motoristas
                .filter((m) => m.favorito)
                .map((m) => (
                  <li key={m.nome} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">{m.veiculo}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Star className="size-3.5 fill-current" /> {m.nota}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
