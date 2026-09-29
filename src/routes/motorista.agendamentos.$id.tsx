import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { BellRing, CheckCircle2, Clock, PlayCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ChatCorrida } from "@/components/chat-corrida";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { agendamentos, caracteristicasDaModalidade, formatarBRL, type StatusAgendamento } from "@/lib/dados";


export const Route = createFileRoute("/motorista/agendamentos/$id")({
  loader: ({ params }) => {
    const agendamento = agendamentos.find((a) => a.id === params.id);
    if (!agendamento) throw notFound();
    return { agendamento };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Agendamento indisponível" }, { name: "robots", content: "noindex" }] };
    }
    const titulo = `Corrida ${loaderData.agendamento.id} — painel do motorista`;
    return {
      meta: [
        { title: titulo },
        { name: "description", content: "Confirme, recuse, inicie ou conclua a corrida agendada." },
        { property: "og:title", content: titulo },
        { property: "og:description", content: "Detalhes da corrida, chat com o cliente e lembretes automáticos." },
      ],
    };
  },
  component: DetalhesMotorista,
});

function DetalhesMotorista() {
  const { agendamento } = Route.useLoaderData();
  const [status, setStatus] = useState<StatusAgendamento>(agendamento.status);
  const [inicioRegistrado, setInicioRegistrado] = useState(status === "em-andamento");

  return (
    <AppShell
      titulo={`Corrida ${agendamento.id}`}
      descricao={`${agendamento.cliente} · ${agendamento.modalidade}`}
      acao={<StatusBadge status={status} />}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-warning/30 bg-warning/10 p-4">
            <p className="flex items-center gap-2 text-sm text-warning">
              <BellRing className="size-4" /> Lembrete enviado ao motorista e ao cliente: embarque em {agendamento.ida}.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Se o início não for atualizado até 2 horas antes, o agendamento é liberado como prioridade para outro
              motorista.
            </p>
          </Card>

          <Card className="surface-luxe border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Detalhes da corrida</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Cliente", agendamento.cliente],
                ["Embarque", agendamento.embarque],
                ["Parada", agendamento.parada ?? "Sem parada"],
                ["Desembarque", agendamento.desembarque],
                ["Ida", agendamento.ida],
                ["Retorno", agendamento.retorno ?? "Somente ida"],
                ["Veículo agendado", agendamento.veiculo],
                ["Ocupantes", String(agendamento.ocupantes.length)],
                ["Pagamento", agendamento.pagamento],
                ["Valor a receber", formatarBRL(agendamento.valor)],
              ].map(([rotulo, texto]) => (
                <div key={rotulo}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
                  <dd className="mt-1 text-sm">{texto}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              A troca de veículo depende da aceitação do cliente.
            </p>
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Como proceder · {agendamento.modalidade}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {caracteristicasDaModalidade(agendamento.modalidade)}
            </p>
          </Card>

          <ChatCorrida
            agendamentoId={agendamento.id}
            origem="motorista"
            cliente={agendamento.cliente}
            motorista={agendamento.motorista}
            veiculo={agendamento.veiculo}
            embarque={agendamento.embarque}
            desembarque={agendamento.desembarque}
            modalidade={agendamento.modalidade}
          />
        </div>


        <aside className="space-y-3">
          <Button
            className="w-full"
            onClick={() => {
              setStatus("confirmado");
              toast.success("Interesse confirmado. Chat liberado com o cliente.");
            }}
          >
            <CheckCircle2 /> Confirmar interesse
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              setStatus("pendente");
              toast("Agendamento recusado e mantido disponível na lista.");
            }}
          >
            <XCircle /> Recusar agendamento
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            disabled={inicioRegistrado}
            onClick={() => {
              setInicioRegistrado(true);
              setStatus("em-andamento");
              toast.success("Início da corrida registrado.");
            }}
          >
            <PlayCircle /> {inicioRegistrado ? "Início registrado" : "Atualizar início da corrida"}
          </Button>
          <Button
            className="w-full"
            onClick={() => {
              setStatus("concluido");
              toast.success("Corrida concluída. Pagamento liberado para saque.");
            }}
          >
            <Clock /> Concluir corrida
          </Button>
        </aside>
      </div>
    </AppShell>
  );
}
