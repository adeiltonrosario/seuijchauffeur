import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, CreditCard, QrCode, Repeat } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarBRL } from "@/lib/dados";
import {
  VALIDADE_CREDITOS_DIAS,
  carregarCreditos,
  consumirCreditos,
  creditosAVencer,
  saldoDisponivel,
  salvarCreditos,
  type LoteCredito,
} from "@/lib/assinaturas";

export const Route = createFileRoute("/cliente/pagamento")({
  head: () => ({
    meta: [
      { title: "Pagamento da corrida — seuchauffeur" },
      { name: "description", content: "Pague sua corrida agendada com Pix, cartão de crédito ou plano mensal." },
      { property: "og:title", content: "Pagamento da corrida — seuchauffeur" },
      { property: "og:description", content: "Resumo de valores e confirmação de pagamento do agendamento." },
    ],
  }),
  component: Pagamento,
});

const chavePix = "pix@seuchauffeur.com.br";

function Pagamento() {
  const [metodo, setMetodo] = useState<"pix" | "cartao" | "plano">("pix");
  const [lotes, setLotes] = useState<LoteCredito[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setLotes(carregarCreditos());
  }, []);

  const saldo = saldoDisponivel(lotes);
  const aVencer = creditosAVencer(lotes, 30);
  const usandoCredito = metodo === "plano" && saldo > 0;

  const valor = 320;
  const taxa = 12.9;
  const total = usandoCredito ? 0 : valor + taxa;

  const confirmar = () => {
    if (metodo === "plano") {
      if (saldo < 1) {
        toast.error("Você não tem créditos disponíveis. Assine um plano ou pague por Pix ou cartão.");
        return;
      }
      const { lotes: atualizados } = consumirCreditos(lotes, 1);
      setLotes(atualizados);
      salvarCreditos(atualizados);
      toast.success(`1 crédito usado nesta corrida. Saldo restante: ${saldo - 1}.`);
      navigate({ to: "/cliente" });
      return;
    }
    toast.success("Pagamento registrado. Aguardando confirmação do motorista.");
    navigate({ to: "/cliente" });
  };

  return (
    <AppShell titulo="Pagamento" descricao="O valor só é liberado ao motorista após a conclusão da corrida.">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-border/60 p-6">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { id: "pix", rotulo: "Pix", icone: QrCode },
              { id: "cartao", rotulo: "Cartão de crédito", icone: CreditCard },
              { id: "plano", rotulo: "Plano mensal", icone: Repeat },
            ].map((opcao) => (
              <button
                key={opcao.id}
                type="button"
                onClick={() => setMetodo(opcao.id as typeof metodo)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  metodo === opcao.id
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                <opcao.icone className="size-4" /> {opcao.rotulo}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {metodo === "pix" ? (
              <div className="flex flex-wrap items-center gap-6">
                <div className="grid w-40 grid-cols-10 gap-px rounded-md bg-foreground p-2">
                  {Array.from({ length: 100 }, (_, i) => (
                    <span
                      key={i}
                      className={`aspect-square ${(i * 7 + Math.floor(i / 10)) % 3 ? "bg-background" : "bg-foreground"}`}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chave Pix</p>
                  <p className="font-display text-lg">{chavePix}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => toast.success("Chave Pix copiada.")}
                  >
                    <Copy /> Copiar chave
                  </Button>
                </div>
              </div>
            ) : null}

            {metodo === "cartao" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="numero">Número do cartão</Label>
                  <Input id="numero" placeholder="0000 0000 0000 0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validade">Validade</Label>
                  <Input id="validade" placeholder="MM/AA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" placeholder="123" />
                </div>
              </div>
            ) : null}

            {metodo === "plano" ? (
              <div className="rounded-lg bg-secondary/50 p-5">
                <p className="text-sm font-medium">
                  {saldo > 0
                    ? `${saldo} ${saldo === 1 ? "crédito disponível" : "créditos disponíveis"} na sua assinatura`
                    : "Nenhum crédito disponível"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {saldo > 0
                    ? `Esta corrida consome 1 crédito, sem cobrança adicional. Cada crédito vale por ${VALIDADE_CREDITOS_DIAS} dias.`
                    : "Assine um plano na tela inicial para receber créditos de viagem, ou pague por Pix ou cartão."}
                </p>
                {aVencer > 0 ? (
                  <p className="mt-3 text-xs text-primary">
                    {aVencer} {aVencer === 1 ? "crédito vence" : "créditos vencem"} nos próximos 30 dias.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="surface-luxe h-fit border-border/60 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Resumo de valores</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between text-muted-foreground">
              <span>Corrida ida e retorno</span>
              <span className="text-foreground">{formatarBRL(valor)}</span>
            </li>
            <li className="flex justify-between text-muted-foreground">
              <span>Taxa de serviço</span>
              <span className="text-foreground">{formatarBRL(taxa)}</span>
            </li>
            {usandoCredito ? (
              <li className="flex justify-between text-muted-foreground">
                <span>Crédito do plano (1 viagem)</span>
                <span className="text-primary">−{formatarBRL(valor + taxa)}</span>
              </li>
            ) : null}
            <li className="flex justify-between border-t border-border/70 pt-3 text-muted-foreground">
              <span>Total</span>
              <span className="font-display text-lg text-primary">{formatarBRL(total)}</span>
            </li>
          </ul>
          <Button className="mt-5 w-full" onClick={confirmar}>
            {usandoCredito ? "Usar 1 crédito e confirmar" : "Confirmar pagamento"}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
