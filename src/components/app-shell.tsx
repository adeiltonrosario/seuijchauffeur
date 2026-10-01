import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Car, UserRound } from "lucide-react";

const menuCliente = [
  { para: "/cliente", texto: "Início" },
  { para: "/cliente/agendamento/novo", texto: "Agendar" },
  { para: "/mapa", texto: "Mapa" },
  { para: "/favoritos", texto: "Favoritos" },
  { para: "/agente-suporte", texto: "Suporte IA" },
] as const;

const menuMotorista = [
  { para: "/motorista/agendamentos", texto: "Agendamentos" },
  { para: "/motorista/disponibilidade", texto: "Disponibilidade" },
  { para: "/motorista/veiculos", texto: "Veículos" },
  { para: "/motorista/ganhos", texto: "Ganhos" },
] as const;

export function AppShell({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const areaMotorista = pathname.startsWith("/motorista");
  const navegacao = areaMotorista ? menuMotorista : menuCliente;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight">
            seu<span className="text-gold">chauffeur</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {navegacao.map((item) => (
              <Link
                key={item.para}
                to={item.para}
                className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
                activeOptions={{ exact: item.para === "/cliente" }}
              >
                {item.texto}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link
              to={areaMotorista ? "/cliente" : "/motorista/agendamentos"}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {areaMotorista ? <UserRound className="size-4" /> : <Car className="size-4" />}
              {areaMotorista ? "Ir para Cliente" : "Área do  Motorista"}
            </Link>
            <Link
              to="/admin"
              className="rounded-full px-2 py-1.5 text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{titulo}</h1>
            {descricao ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descricao}</p> : null}
          </div>
          {acao}
        </div>
        {children}
      </main>
    </div>
  );
}
