import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, Route as RouteIcon, Star, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CATEGORIAS_CARGA,
  CATEGORIAS_PASSAGEIROS,
  agendamentos,
  capacidadeDaCategoria,
  caracteristicasDaModalidade,
  cargaDaCategoria,
  formatarBRL,
} from "@/lib/dados";

export const Route = createFileRoute("/cliente/agendamentos/$id")({
  loader: ({ params }) => {
    const agendamento = agendamentos.find((a) => a.id === params.id);
    if (!agendamento) throw notFound();
    return { agendamento };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Agendamento indisponível" }, { name: "robots", content: "noindex" }] };
    }
    const titulo = `Agendamento ${loaderData.agendamento.id} — seuchauffeur`;
    return {
      meta: [
        { title: titulo },
        {
          name: "description",
          content: `Corrida de ${loaderData.agendamento.embarque} até ${loaderData.agendamento.desembarque}.`,
        },
        { property: "og:title", content: titulo },
        { property: "og:description", content: "Detalhes, ocupantes, veículo e chat com o motorista." },
      ],
    };
  },
  component: DetalhesAgendamento,
});

function DetalhesAgendamento() {
  const { agendamento } = Route.useLoaderData();
  const [categoria, setCategoria] = useState(agendamento.categoria);
  const [ocupantes, setOcupantes] = useState(agendamento.ocupantes);
  const [novoOcupante, setNovoOcupante] = useState("");
  const [valor, setValor] = useState(agendamento.valor);

  const capacidade = capacidadeDaCategoria(categoria);

  const incluirOcupante = () => {
    if (!novoOcupante.trim()) return;
    if (ocupantes.length >= capacidade) {
      toast.error(`O veículo ${categoria} comporta ${capacidade} ocupantes.`);
      return;
    }
    setOcupantes((atual) => [...atual, novoOcupante.trim()]);
    setNovoOcupante("");
  };

  return (
    <AppShell
      titulo={`Corrida ${agendamento.id}`}
      descricao={`${agendamento.modalidade} · motorista ${agendamento.motorista}`}
      acao={<StatusBadge status={agendamento.status} />}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="surface-luxe border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Detalhes da corrida</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Embarque", agendamento.embarque],
                ["Parada", agendamento.parada ?? "Sem parada"],
                ["Desembarque", agendamento.desembarque],
                ["Ida", agendamento.ida],
                ["Retorno", agendamento.retorno ?? "Somente ida"],
                ["Pagamento", agendamento.pagamento],
                ["Veículo", agendamento.veiculo],
                ["Valor acordado", formatarBRL(valor)],
              ].map(([rotulo, texto]) => (
                <div key={rotulo}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
                  <dd className="mt-1 text-sm">{texto}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Como proceder · {agendamento.modalidade}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {caracteristicasDaModalidade(agendamento.modalidade)}
            </p>
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Tipo de veículo</h2>
            <div className="mt-4 space-y-4">
              {(
                [
                  { titulo: "Passageiros", lista: CATEGORIAS_PASSAGEIROS },
                  { titulo: "Carga (carretos e mudanças)", lista: CATEGORIAS_CARGA },
                ] as const
              ).map((grupo) => (
                <div key={grupo.titulo} className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{grupo.titulo}</p>
                  <div className="flex flex-wrap gap-2">
                    {grupo.lista.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategoria(c)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          categoria === c
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Capacidade: {capacidade} ocupantes.
              {cargaDaCategoria(categoria) ? ` Carga: ${cargaDaCategoria(categoria)}.` : ""} A troca de veículo só vale
              após a aceitação do motorista.
            </p>
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Ocupantes</h2>
            <ul className="mt-4 space-y-2">
              {ocupantes.map((o) => (
                <li key={o} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                  {o}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setOcupantes((atual) => atual.filter((i) => i !== o))}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input
                value={novoOcupante}
                placeholder="Nome do ocupante"
                onChange={(e) => setNovoOcupante(e.target.value)}
              />
              <Button variant="secondary" onClick={incluirOcupante}>
                Incluir
              </Button>
            </div>
          </Card>

          <ChatCorrida
            agendamentoId={agendamento.id}
            origem="cliente"
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
            variant="secondary"
            onClick={() => {
              setValor((v) => Math.round(v * 1.12));
              toast.success("Rota ajustada e valor recalculado.");
            }}
          >
            <RouteIcon /> Ajustar rota
          </Button>
          <Button className="w-full" asChild>
            <Link to="/agente-suporte">
              <MessageCircle /> Abrir chat
            </Link>
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => toast.success(`Convite de fidelização enviado a ${agendamento.motorista}.`)}
          >
            <Star /> Favoritar motorista
          </Button>
          <Button className="w-full" variant="secondary" asChild>
            <Link to="/favoritos">
              <UserPlus /> Meus favoritos
            </Link>
          </Button>
          <Button
            className="w-full"
            variant="destructive"
            onClick={() => toast.error("Agendamento cancelado.")}
          >
            Cancelar agendamento
          </Button>
        </aside>
      </div>
    </AppShell>
  );
}
