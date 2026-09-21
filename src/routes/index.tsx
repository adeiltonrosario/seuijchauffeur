import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { planos } from "@/lib/dados";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "seuchauffeur — Entrar e escolher seu plano" },
      {
        name: "description",
        content:
          "Acesse como cliente ou motorista, agende corridas com embarque, parada e desembarque e escolha um plano mensal.",
      },
      { property: "og:title", content: "seuchauffeur — Entrar e escolher seu plano" },
      {
        property: "og:description",
        content: "Transporte agendado com motoristas confirmados, pagamento por Pix, cartão ou plano mensal.",
      },
    ],
  }),
  component: Autenticacao,
});

function Autenticacao() {
  const [perfil, setPerfil] = useState<"cliente" | "motorista">("cliente");
  const [criandoConta, setCriandoConta] = useState(false);
  const navigate = useNavigate();

  const entrar = () => {
    navigate({ to: perfil === "cliente" ? "/cliente" : "/motorista/agendamentos" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="surface-luxe border-border/60 p-8">
          <p className="font-display text-2xl font-semibold">
            seu<span className="text-gold">chauffeur</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {criandoConta ? "Crie sua conta em menos de um minuto." : "Entre para acompanhar seus agendamentos."}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-full border border-border/70 bg-secondary/60 p-1">
            {(["cliente", "motorista"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setPerfil(tipo)}
                className={`rounded-full py-2 text-sm font-medium capitalize transition-colors ${
                  perfil === tipo ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              entrar();
            }}
          >
            {criandoConta ? (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" placeholder="Seu nome" />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="voce@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full">
              {criandoConta ? "Criar conta" : "Entrar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setCriandoConta((v) => !v)}
            >
              {criandoConta ? "Já tenho conta" : "Criar conta"}
            </Button>
          </form>
        </Card>

        <div>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold">Planos para quem viaja sempre</h1>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Agende ida e retorno com pontos de parada, pague por Pix, cartão ou assinatura mensal e libere o valor
                ao motorista apenas quando a corrida terminar.
              </p>
            </div>
            <Card className="border-border/60 p-4 text-center">
              <QrCode />
              <p className="mt-3 text-xs text-muted-foreground">
                Escaneie para conhecer
                <br />
                a landing page
              </p>
            </Card>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {planos.map((plano) => (
              <Card
                key={plano.nome}
                className={`p-6 ${plano.destaque ? "glow-gold border-primary/40" : "border-border/60"}`}
              >
                {plano.destaque ? (
                  <span className="text-xs font-medium uppercase tracking-wide text-primary">Mais escolhido</span>
                ) : null}
                <h2 className="mt-2 text-lg font-semibold">{plano.nome}</h2>
                <p className="mt-2 font-display text-2xl">{plano.preco}</p>
                <p className="mt-2 text-sm text-muted-foreground">{plano.corridas}</p>
                <Button variant={plano.destaque ? "default" : "secondary"} className="mt-5 w-full">
                  Assinar
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QrCode() {
  const celulas = Array.from({ length: 144 }, (_, i) => {
    const linha = Math.floor(i / 12);
    const coluna = i % 12;
    const cantos =
      (linha < 3 && coluna < 3) || (linha < 3 && coluna > 8) || (linha > 8 && coluna < 3);
    return cantos || (linha * coluna + linha + coluna) % 3 === 0;
  });

  return (
    <div className="mx-auto grid w-32 grid-cols-12 gap-px rounded-md bg-foreground p-2">
      {celulas.map((ativo, i) => (
        <span key={i} className={`aspect-square ${ativo ? "bg-background" : "bg-foreground"}`} />
      ))}
    </div>
  );
}
