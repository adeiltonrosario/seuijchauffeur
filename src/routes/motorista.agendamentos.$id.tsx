import { createFileRoute } from "@tanstack/react-router";
import { BellRing, CheckCircle2, Clock, Navigation, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { AvisoWhatsapp } from "@/components/aviso-whatsapp";
import { ChatCorrida } from "@/components/chat-corrida";
import { MapaLocal } from "@/components/mapa-local";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { caracteristicasDaModalidade, formatarBRL, type StatusAgendamento } from "@/lib/dados";
import { atualizarStatusCorrida, useCorridas } from "@/lib/corridas";
import { useMotoristaLogado } from "@/lib/motorista-sessao";

export const Route = createFileRoute("/motorista/agendamentos/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Corrida ${params.id} — painel do motorista` },
      { name: "description", content: "Confirme, inicie ou conclua a corrida agendada." },
      { property: "og:title", content: `Corrida ${params.id} — painel do motorista` },
      { property: "og:description", content: "Detalhes da corrida, trajeto completo e chat mediado." },
    ],
  }),
  component: DetalhesMotorista,
});

function DetalhesMotorista() {
  const { id } = Route.useParams();
  const { carregando, motorista } = useMotoristaLogado();
  const corridas = useCorridas({ id, motorista: motorista?.nome ?? "", ...(motorista ? {} : { cliente: "" }) });
  const agendamento = corridas[0];

  if (!agendamento) {
    return (
      <AppShell titulo={`Corrida ${id}`} descricao="Painel do motorista">
        <p className="text-sm text-muted-foreground">
          {carregando ? "Carregando…" : !motorista
            ? "Entre com sua conta de motorista para ver esta corrida."
            : "Corrida não encontrada ou não vinculada a você."}
        </p>
      </AppShell>
    );
  }

  const status = agendamento.status;
  const ativo = motorista?.status === "ativo";
  const mudar = async (novo: StatusAgendamento, msg: string) => {
    if (!ativo) { toast.error("Seu cadastro precisa estar ativo."); return; }
    if (await atualizarStatusCorrida(agendamento.id, novo)) toast.success(msg);
    else toast.error("Não foi possível salvar. Tente novamente.");
  };

  return (
    <AppShell
      titulo={`Corrida ${agendamento.id}`}
      descricao={`${agendamento.cliente} · ${agendamento.modalidade}`}
      acao={<StatusBadge status={status} />}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <AvisoWhatsapp agendamento={agendamento} />
          <Card className="border-warning/30 bg-warning/10 p-4">
            <p className="flex items-center gap-2 text-sm text-warning">
              <BellRing className="size-4" /> Embarque em {agendamento.ida}.
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
                ["Pagamento", agendamento.pagamento],
                ["Valor a receber", formatarBRL(agendamento.valor)],
              ].map(([rotulo, texto]) => (
                <div key={rotulo}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
                  <dd className="mt-1 text-sm">{texto}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="surface-luxe border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Pontos do trajeto</h2>
            <Button asChild className="mt-4 w-full">
              <a
                href={`https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${encodeURIComponent(agendamento.embarque)}&destination=${encodeURIComponent(agendamento.desembarque)}${agendamento.parada ? `&waypoints=${encodeURIComponent(agendamento.parada)}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation /> Abrir rota completa no GPS
              </a>
            </Button>
            <div className="mt-4 space-y-3">
              <MapaLocal rotulo="Embarque" endereco={agendamento.embarque} destaque="embarque" observacao={`Chegada no horário: ${agendamento.ida}.`} />
              {agendamento.parada ? (
                <MapaLocal rotulo="Parada" endereco={agendamento.parada} destaque="parada" observacao="3 minutos de espera inclusos." />
              ) : null}
              <MapaLocal rotulo="Desembarque" endereco={agendamento.desembarque} destaque="desembarque" observacao="Apoio ao desembarque conforme a modalidade." />
            </div>
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
          <Button className="w-full" disabled={status !== "pendente"} onClick={() => mudar("confirmado", "Corrida confirmada.")}>
            <CheckCircle2 /> Confirmar corrida
          </Button>
          <Button className="w-full" variant="secondary" disabled={status !== "confirmado"} onClick={() => mudar("em-andamento", "Início da corrida registrado.")}>
            <PlayCircle /> Iniciar corrida
          </Button>
          <Button className="w-full" disabled={status !== "em-andamento"} onClick={() => mudar("concluido", "Corrida concluída.")}>
            <Clock /> Concluir corrida
          </Button>
        </aside>
      </div>
    </AppShell>
  );
}
