import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Car, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const menuCliente = [
  { para: "/cliente", texto: "Início" },
  { para: "/cliente/agendamento/novo", texto: "Agendar" },
  { para: "/cliente/pacotes", texto: "Pacotes" },
  { para: "/cliente/carteira", texto: "Carteira" },
  { para: "/cliente/cofre-de-creditos", texto: "Cofre" },
  { para: "/cliente/saldao", texto: "Saldão" },
  { para: "/mapa", texto: "Mapa" },
  { para: "/favoritos", texto: "Favoritos" },
] as const;

const menuAdmin = [
  { para: "/admin", texto: "Painel" },
  { para: "/cliente/translado-esportivo", texto: "Esportivo" },
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
  const areaAdmin = pathname.startsWith("/admin");
  const [casaApoio, setCasaApoio] = useState(false);
  const [modulos, setModulos] = useState<string[]>([]);
  useEffect(() => {
    if (areaMotorista || areaAdmin) return;
    const email = localStorage.getItem("seuchauffeur:cliente-email") ?? "";
    if (!email.includes("@")) return;
    void supabase.rpc("acesso_casa_apoio", { _email: email }).then(({ data }) => {
      const a = data as { status?: string } | null;
      setCasaApoio(a?.status === "ativo");
    });
    void supabase.rpc("modulos_liberados", { _email: email }).then(({ data }) => {
      setModulos((data as string[] | null) ?? []);
    });
  }, [areaMotorista, areaAdmin]);
  const itensCliente: { para: string; texto: string }[] = [...menuCliente];
  if (casaApoio) itensCliente.splice(3, 0, { para: "/cliente/casa-apoio", texto: "Casa de Apoio" });
  if (modulos.includes("esportivo")) itensCliente.push({ para: "/cliente/translado-esportivo", texto: "Esportivo" });
  if (modulos.includes("suporte_ia")) itensCliente.push({ para: "/agente-suporte", texto: "Suporte IA" });
  const navegacao: readonly { para: string; texto: string }[] = areaAdmin ? menuAdmin : areaMotorista ? menuMotorista : itensCliente;

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
                <span>{item.texto}</span>
              </Link>
            ))}
          </nav>

          {areaAdmin ? (
            <div className="ml-auto flex items-center gap-2 text-sm">
              <Link
                to="/cliente"
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <UserRound className="size-4" />
                <span>Área do Cliente</span>
              </Link>
              <Link
                to="/motorista/agendamentos"
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Car className="size-4" />
                <span>Área do Motorista</span>
              </Link>
            </div>
          ) : null}
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
