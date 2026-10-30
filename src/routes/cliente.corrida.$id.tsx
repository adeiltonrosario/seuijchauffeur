import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, MessageCircle, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatCorrida } from "@/components/chat-corrida";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarBRL } from "@/lib/dados";
import { useCorridas } from "@/lib/corridas";
import { mensagemCandidatura, useCandidaturas, vincularMotorista } from "@/lib/candidaturas";

export const Route = createFileRoute("/cliente/corrida/$id")({
  head: () => ({
    meta: [
      { title: "Meu agendamento — seuchauffeur" },
      { name: "description", content: "Veja os motoristas interessados no seu agendamento e vincule o escolhido." },
      { property: "og:title", content: "Meu agendamento — seuchauffeur" },
      { property: "og:description", content: "Escolha e vincule o motorista do seu agendamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CorridaCliente,
});

type Contato = { nome: string; veiculo: string; placa: string; categoria: string; whatsapp: string };

function CorridaCliente() {
  const { id } = Route.useParams();
  const corrida = useCorridas({ id })[0];
  const candidaturas = useCandidaturas(id);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [contato, setContato] = useState<Contato | null>(null);
  const vinculado = corrida?.motorista ?? "";

  useEffect(() => {
    if (!vinculado) { setContato(null); return; }
    void supabase.rpc("contato_motorista_corrida", { _corrida: id }).then(({ data }) =>
      setContato((data as Contato | null) ?? null),
    );
  }, [id, vinculado]);

  const vincular = async (candId: string, nome: string) => {
    setEnviando(candId);
    const r = await vincularMotorista(candId);
    setEnviando(null);
    if (r === "ok") toast.success(`${nome} foi vinculado ao seu agendamento.`);
    else toast.error(mensagemCandidatura(r));
  };

  if (!corrida) {
    return (
      <AppShell titulo="Agendamento" descricao="Carregando seu agendamento…">
        <Card className="p-6 text-sm text-muted-foreground">
          Se o agendamento não aparecer, verifique se você está conectado à sua conta.{" "}
          <Link to="/cliente" className="text-primary underline">Voltar</Link>
        </Card>
      </AppShell>
    );
  }

  const aberto = corrida.status === "aguardando_motorista";

  return (
    <AppShell titulo={`Agendamento ${corrida.id}`} descricao={`${corrida.modalidade} · ${corrida.ida}`}>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Motoristas interessados
            </h2>
            <StatusBadge status={corrida.status} />
          </div>

          {!aberto && corrida.motorista ? (
            <div className="mt-4 space-y-3 rounded-lg border border-primary/40 bg-primary/10 p-4">
              <p className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-5 text-primary" />
                Motorista vinculado: <span className="font-medium text-primary">{contato?.nome ?? corrida.motorista}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {contato?.veiculo ?? corrida.veiculo}
                {contato?.placa ? ` · placa ${contato.placa}` : ""}
                {contato?.categoria ? ` · ${contato.categoria}` : ""}
              </p>
              {contato?.whatsapp ? (
                <Button size="sm" asChild>
                  <a
                    href={`https://wa.me/55${contato.whatsapp.replace(/\D/g, "").replace(/^55/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle /> Falar com o motorista
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}

          {aberto && candidaturas.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" /> Seu agendamento está aberto. Assim que motoristas demonstrarem
              interesse, eles aparecerão aqui.
            </p>
          ) : null}

          <ul className="mt-4 grid gap-3">
            {candidaturas.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-secondary">
                    <UserRound className="size-5 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{c.motorista_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.veiculo} · {c.placa} · {c.categoria}
                    </p>
                  </div>
                </div>
                {aberto ? (
                  <Button size="sm" disabled={enviando !== null} onClick={() => void vincular(c.id, c.motorista_nome)}>
                    {enviando === c.id ? "Vinculando…" : "Vincular"}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {c.status === "selecionado" ? "Selecionado" : "Não selecionado"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-3 border-border/60 p-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Embarque</p>
            <p>{corrida.embarque}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Desembarque</p>
            <p>{corrida.desembarque}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Data</p>
            <p>{corrida.ida}{corrida.retorno ? ` · retorno ${corrida.retorno}` : ""}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="text-gold">{formatarBRL(corrida.valor)}</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
