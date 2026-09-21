import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarBRL, modalidades, motoristas } from "@/lib/dados";

export const Route = createFileRoute("/cliente/agendamento/novo")({
  head: () => ({
    meta: [
      { title: "Agendar corrida — seuchauffeur" },
      {
        name: "description",
        content: "Defina embarque, parada e desembarque, escolha datas de ida e retorno, modalidade e pagamento.",
      },
      { property: "og:title", content: "Agendar corrida — seuchauffeur" },
      { property: "og:description", content: "Crie agendamentos de ida e retorno com valor acordado com o motorista." },
    ],
  }),
  component: NovoAgendamento,
});

type Horario = { id: number; tipo: "Ida" | "Retorno"; data: string; hora: string };

function NovoAgendamento() {
  const navigate = useNavigate();
  const [horarios, setHorarios] = useState<Horario[]>([
    { id: 1, tipo: "Ida", data: "2026-09-22", hora: "07:30" },
    { id: 2, tipo: "Retorno", data: "2026-09-22", hora: "21:15" },
  ]);
  const [modalidade, setModalidade] = useState(modalidades[0]!);
  const [pagamento, setPagamento] = useState<"Pix" | "Cartão de crédito" | "Plano mensal">("Pix");
  const [motorista, setMotorista] = useState(motoristas[0]!.nome);


  const adicionarHorario = (tipo: "Ida" | "Retorno") => {
    const novo = { id: Date.now(), tipo, data: "2026-09-23", hora: "08:00" };
    const conflito = horarios.some((h) => h.data === novo.data && h.hora === novo.hora);
    if (conflito) {
      toast.error("Conflito de agenda nesse dia e horário.");
      return;
    }
    setHorarios((atual) => [...atual, novo]);
  };

  const escolhido = motoristas.find((m) => m.nome === motorista)!;

  return (
    <AppShell titulo="Agendar corrida" descricao="Ida e retorno, pontos de parada e valor acordado com o motorista.">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Trajeto</h2>
            <div className="mt-4 space-y-4">
              {[
                { id: "embarque", rotulo: "Endereço de embarque", valor: "Av. Paulista, 1400 — São Paulo" },
                { id: "parada", rotulo: "Ponto de parada", valor: "Rua Augusta, 900" },
                { id: "desembarque", rotulo: "Endereço de desembarque", valor: "Aeroporto de Congonhas" },
              ].map((campo) => (
                <div key={campo.id} className="space-y-2">
                  <Label htmlFor={campo.id}>{campo.rotulo}</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id={campo.id} defaultValue={campo.valor} className="pl-9" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-border/60 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Datas e horários</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => adicionarHorario("Ida")}>
                  <Plus /> Ida
                </Button>
                <Button size="sm" variant="secondary" onClick={() => adicionarHorario("Retorno")}>
                  <Plus /> Retorno
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {horarios.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary/50 p-3">
                  <span className="w-20 text-sm font-medium">{h.tipo}</span>
                  <Input
                    type="date"
                    value={h.data}
                    className="w-40"
                    onChange={(e) =>
                      setHorarios((atual) =>
                        atual.map((i) => (i.id === h.id ? { ...i, data: e.target.value } : i)),
                      )
                    }
                  />
                  <Input
                    type="time"
                    value={h.hora}
                    className="w-28"
                    onChange={(e) =>
                      setHorarios((atual) =>
                        atual.map((i) => (i.id === h.id ? { ...i, hora: e.target.value } : i)),
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setHorarios((atual) => atual.filter((i) => i.id !== h.id))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Modalidade</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {modalidades.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalidade(m)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    modalidade === m
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <h2 className="mt-6 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Forma de pagamento
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(["Pix", "Cartão de crédito", "Plano mensal"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPagamento(p)}
                  className={`rounded-lg border px-4 py-3 text-sm transition-colors ${
                    pagamento === p ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="surface-luxe border-border/60 p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Motoristas disponíveis
            </h2>
            <ul className="mt-4 space-y-2">
              {motoristas.map((m) => (
                <li key={m.nome}>
                  <button
                    type="button"
                    onClick={() => setMotorista(m.nome)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      motorista === m.nome ? "border-primary/50 bg-primary/10" : "border-border/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{m.nome}</span>
                      <span className="text-sm text-primary">{formatarBRL(m.valor)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.veiculo} · nota {m.nota}
                    </p>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-5 space-y-1 border-t border-border/70 pt-4 text-sm">
              <p className="flex justify-between text-muted-foreground">
                <span>Modalidade</span>
                <span className="text-foreground">{modalidade}</span>
              </p>
              <p className="flex justify-between text-muted-foreground">
                <span>Pagamento</span>
                <span className="text-foreground">{pagamento}</span>
              </p>
              <p className="flex justify-between text-muted-foreground">
                <span>Valor acordado</span>
                <span className="font-display text-base text-primary">{formatarBRL(escolhido.valor)}</span>
              </p>
            </div>

            <Button
              className="mt-5 w-full"
              onClick={() => {
                toast.success(`Agendamento enviado a ${motorista}.`);
                navigate({ to: "/cliente/pagamento" });
              }}
            >
              Confirmar agendamento
            </Button>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
