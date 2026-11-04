import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Bot, Car, Send, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { carregarConversa, type MensagemMediada } from "@/lib/chat-mediado";
import { agendamentos, conversas, formatarBRL, mensagensMediadas, padroesAtendimento } from "@/lib/dados";


export const Route = createFileRoute("/agente-suporte")({
  head: () => ({
    meta: [
      { title: "Agente de suporte IA — seuchauffeur" },
      {
        name: "description",
        content: "A IA intermedia a conversa entre cliente e motorista, repassando avisos e eventualidades.",
      },
      { property: "og:title", content: "Agente de suporte IA — seuchauffeur" },
      { property: "og:description", content: "Conversas ativas, padrões de atendimento e repasses automáticos." },
    ],
  }),
  component: AgenteSuporte,
});

type Mensagem = { autor: "motorista" | "cliente" | "ia"; texto: string; hora: string };

const estiloAutor: Record<Mensagem["autor"], string> = {
  motorista: "border-primary/30 bg-primary/10",
  cliente: "border-accent/30 bg-accent/10",
  ia: "border-border/70 bg-secondary/50",
};

const rotuloAutor: Record<Mensagem["autor"], string> = {
  motorista: "Motorista",
  cliente: "Cliente",
  ia: "IA (mediação)",
};

function AgenteSuporte() {
  const [ativa, setAtiva] = useState(conversas[0]?.id ?? "");
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensMediadas);
  const [rascunho, setRascunho] = useState("A IA sugere: seu motorista chega em 12 minutos.");
  const [verPadroes, setVerPadroes] = useState(false);
  const [auditoria, setAuditoria] = useState<MensagemMediada[]>([]);

  const conversa = conversas.find((c) => c.id === ativa);
  const agendamento = conversa ? agendamentos.find((a) => a.id === conversa.agendamento) : undefined;

  useEffect(() => {
    setAuditoria(agendamento ? carregarConversa(agendamento.id) : []);
  }, [agendamento]);

  const hora = () =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });


  const enviar = (autor: Mensagem["autor"], texto: string) => {
    if (!texto.trim()) return;
    setMensagens((atual) => [...atual, { autor, texto: texto.trim(), hora: hora() }]);
  };

  return (
    <AppShell
      titulo="Agente de suporte IA"
      descricao="A IA repassa mensagens entre cliente e motorista; o operador pode revisar antes do envio."
      acao={
        <Button variant="secondary" onClick={() => setVerPadroes((v) => !v)}>
          <BookOpen /> Padrões de atendimento
        </Button>
      }
    >
      {verPadroes ? (
        <Card className="mb-6 border-border/60 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Diretrizes e scripts padronizados
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {padroesAtendimento.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Conversas ativas</h2>
          {conversas.map((c) => (
            <button key={c.id} type="button" onClick={() => setAtiva(c.id)} className="w-full text-left">
              <Card
                className={`border-border/60 p-4 transition-colors ${
                  ativa === c.id ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.cliente}</span>
                  {c.naoLidas > 0 ? (
                    <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{c.naoLidas}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.motorista} · {c.agendamento}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{c.assunto}</p>
              </Card>
            </button>
          ))}
        </aside>

        <div className="space-y-6">
          <Card className="surface-luxe border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Cartão de atendimento</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <UserRound className="size-3.5" /> Cliente
                </p>
                <p className="mt-1 text-sm">{agendamento.cliente}</p>
                <p className="text-xs text-muted-foreground">{agendamento.embarque}</p>
              </div>
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Car className="size-3.5" /> Motorista
                </p>
                <p className="mt-1 text-sm">{agendamento.motorista}</p>
                <p className="text-xs text-muted-foreground">{agendamento.veiculo}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Corrida</p>
                <p className="mt-1 text-sm">
                  {agendamento.id} · {agendamento.ida}
                </p>
                <p className="text-xs text-muted-foreground">
                  {agendamento.modalidade} · {formatarBRL(agendamento.valor)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Chat mediado pela IA</h2>
            <ul className="mt-4 space-y-3">
              {mensagens.filter((m) => m.autor === "ia").map((m, i) => (
                <li key={i} className={`rounded-lg border p-3 ${estiloAutor[m.autor]}`}>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    {m.autor === "ia" ? <Bot className="size-3.5" /> : null}
                    {rotuloAutor[m.autor]} · {m.hora}
                  </p>
                  <p className="mt-1 text-sm">{m.texto}</p>
                </li>
              ))}
            </ul>

            <Textarea
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              className="mt-4"
              rows={3}
              placeholder="Revise a mensagem sugerida pela IA antes de enviar"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  enviar("ia", rascunho);
                  setRascunho("");
                  toast.success("Mensagem repassada.");
                }}
              >
                <Send /> Enviar mediação
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  enviar("ia", "Aviso ao cliente: houve uma eventualidade no trajeto e o horário foi ajustado.");
                  toast.success("Comunicado enviado ao cliente.");
                }}
              >
                Repassar ao cliente
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  enviar("ia", `Instruções ao motorista: embarque de ${agendamento.cliente} em ${agendamento.embarque}.`);
                  toast.success("Instruções enviadas ao motorista.");
                }}
              >
                Repassar ao motorista
              </Button>
            </div>
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="size-4" /> Comunicados oficiais da corrida · {agendamento.id}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Você vê apenas as mensagens publicadas pela mediação da IA. O texto original da outra parte é privado.
            </p>
            {auditoria.length === 0 ? (
              <p className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-3 text-sm text-muted-foreground">
                Nenhum comunicado nesta corrida ainda.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {auditoria.map((m) => (
                  <li key={m.id} className="rounded-lg border border-border/60 p-3">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Bot className="size-3.5 text-primary" /> Mediação SeuChauffeur · {m.hora}
                    </p>
                    <p className="mt-1 text-sm">{m.mediado}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

      </div>
    </AppShell>
  );
}
