import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, ChevronRight, Star, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { agendamentos, formatarBRL, motoristas } from "@/lib/dados";

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
  const proximos = agendamentos.filter((a) => a.status !== "concluido" && a.status !== "cancelado");

  return (
    <AppShell
      titulo="Olá, Adeilton"
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
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Próximos agendamentos
          </h2>
          {proximos.map((a) => (
            <Link key={a.id} to="/cliente/agendamentos/$id" params={{ id: a.id }}>
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
                    {a.motorista} · {a.modalidade} · {formatarBRL(a.valor)}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </section>

        <aside>
          <Card className="border-border/60 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Favoritos</h2>
              <Link to="/favoritos" className="text-xs text-primary">
                ver todos
              </Link>
            </div>
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
