import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { agendamentos, formatarBRL } from "@/lib/dados";

export const Route = createFileRoute("/motorista/agendamentos/")({
  head: () => ({
    meta: [
      { title: "Agendamentos disponíveis — seuchauffeur" },
      { name: "description", content: "Avalie as corridas agendadas disponíveis e confirme seu interesse." },
      { property: "og:title", content: "Agendamentos disponíveis — seuchauffeur" },
      { property: "og:description", content: "Disponibilidade, filtro por data e lista de corridas agendadas." },
    ],
  }),
  component: AgendamentosMotorista;
});

function AgendamentosMotorista() {
  const [disponivel, setDisponivel] = useState(true);
  const [data, setData] = useState("");

  const lista = agendamentos.filter(
    (a) => a.status !== "cancelado" && (data === "" || a.ida.startsWith(formatarData(data))),
  );

  return (
    <AppShell
      titulo="Agendamentos"
      descricao="O veículo do agendamento só pode ser alterado com a aceitação do cliente."
      acao={
        <div className="flex items-center gap-3 rounded-full border border-border/70 bg-secondary/50 px-4 py-2">
          <Label htmlFor="disponivel" className="text-sm">
            {disponivel ? "Disponível" : "Indisponível"}
          </Label>
          <Switch id="disponivel" checked={disponivel} onCheckedChange={setDisponivel} />
        </div>
      }
    >
      <div className="mb-5 max-w-xs space-y-2">
        <Label htmlFor="filtro-data">Filtrar por data</Label>
        <Input id="filtro-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <div className="space-y-3">
        {lista.map((a) => (
          <Link key={a.id} to="/motorista/agendamentos/$id" params={{ id: a.id }}>
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
                  {a.cliente} · {a.modalidade} · {a.veiculo} · {formatarBRL(a.valor)}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma corrida agendada nesta data.</p>
        ) : null}
      </div>
    </AppShell>
  );
}

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
