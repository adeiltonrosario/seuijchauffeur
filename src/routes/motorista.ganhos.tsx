import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Lock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarBRL } from "@/lib/dados";

export const Route = createFileRoute("/motorista/ganhos")({
  head: () => ({
    meta: [
      { title: "Ganhos do motorista — seuchauffeur" },
      { name: "description", content: "Veja o saldo pendente, os pagamentos liberados e solicite o saque." },
      { property: "og:title", content: "Ganhos do motorista — seuchauffeur" },
      { property: "og:description", content: "Valores liberados somente após a conclusão das corridas." },
    ],
  }),
  component: Ganhos,
});

const liberados = [
  { id: "AG-1045", cliente: "Sofia Andrade", data: "20/09/2026", valor: 140 },
  { id: "AG-1039", cliente: "Bruno Tavares", data: "18/09/2026", valor: 265 },
  { id: "AG-1031", cliente: "Helena Muniz", data: "15/09/2026", valor: 310 },
];

const pendentes = [
  { id: "AG-1042", cliente: "Adeilton Oliveira", data: "22/09/2026", valor: 320 },
  { id: "AG-1044", cliente: "Eduardo Lima", data: "24/09/2026", valor: 540 },
];

function Ganhos() {
  const totalLiberado = liberados.reduce((s, i) => s + i.valor, 0);
  const totalPendente = pendentes.reduce((s, i) => s + i.valor, 0);

  return (
    <AppShell titulo="Ganhos" descricao="Os valores são liberados apenas após a conclusão de cada corrida.">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="surface-luxe border-border/60 p-6">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Lock className="size-3.5" /> Pendente de liberação
            </p>
            <p className="mt-2 font-display text-3xl">{formatarBRL(totalPendente)}</p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              {pendentes.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {p.id} · {p.data}
                  </span>
                  <span>{formatarBRL(p.valor)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="glow-gold border-primary/40 p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Disponível para saque</p>
            <p className="mt-2 font-display text-3xl text-primary">{formatarBRL(totalLiberado)}</p>
            <Button className="mt-4 w-full" onClick={() => toast.success("Saque solicitado. Transferência em até 1 dia útil.")}>
              <Banknote /> Solicitar saque
            </Button>
          </Card>
        </div>

        <Card className="border-border/60 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Pagamentos liberados</h2>
          <ul className="mt-4 divide-y divide-border/70">
            {liberados.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">{l.cliente}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.id} · concluída em {l.data}
                  </p>
                </div>
                <span className="text-sm text-success">{formatarBRL(l.valor)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
