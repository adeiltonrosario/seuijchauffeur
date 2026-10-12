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
import { supabase } from "@/integrations/supabase/client";
import { TARIFA_EXCEDENTE_KM, calcularCobertura, emailCliente } from "@/lib/carteira-km";

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
  const [saldo, setSaldo] = useState(0);
  const [distancia, setDistancia] = useState(18.5);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const km = Number(localStorage.getItem("seuchauffeur:ultima-rota-km"));
    if (km > 0) setDistancia(km);
    const e = emailCliente();
    if (e) void supabase.rpc("saldo_carteira_km", { _email: e }).then(({ data }) => setSaldo(Number((data as { saldo?: number } | null)?.saldo ?? 0)));
  }, []);

  const cob = calcularCobertura(distancia, saldo);
  const usandoCredito = metodo === "plano";
  const valor = Math.round(distancia * TARIFA_EXCEDENTE_KM * 100) / 100;
  const taxa = 8;
  const total = usandoCredito ? cob.total : valor + taxa;
  const fkm = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;

  const confirmar = async () => {
    if (metodo === "plano") {
      const e = emailCliente();
      if (!e || saldo <= 0) {
        toast.error("Sem km disponíveis na carteira. Assine um plano ou pague por Pix ou cartão.");
        return;
      }
      setEnviando(true);
      const { data, error } = await supabase.rpc("reservar_km_corrida", { _email: e, _agendamento: `AG-${Date.now()}`, _km: distancia });
      setEnviando(false);
      const r = data as { ok?: boolean; erro?: string } | null;
      if (error || !r?.ok) { toast.error(r?.erro ?? "Não foi possível reservar os km."); return; }
      toast.success(cob.excedente > 0 ? `${fkm(cob.coberto)} reservados. Pague o excedente de ${formatarBRL(cob.total)}.` : `${fkm(cob.coberto)} reservados da sua carteira.`);
      navigate({ to: "/cliente/carteira" });
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
              { id: "plano", rotulo: "Carteira de km", icone: Repeat },
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
              <div className="rounded-lg bg-secondary/50 p-5 text-sm">
                <ul className="space-y-1">
                  <li className="flex justify-between"><span>Trajeto calculado</span><span>{fkm(distancia)}</span></li>
                  <li className="flex justify-between"><span>Saldo disponível</span><span>{fkm(saldo)}</span></li>
                  <li className="flex justify-between"><span>Coberto pela carteira</span><span className="text-primary">−{fkm(cob.coberto)}</span></li>
                  <li className="flex justify-between"><span>Km excedentes</span><span>{fkm(cob.excedente)}</span></li>
                  <li className="flex justify-between"><span>Saldo após a corrida</span><span>{fkm(cob.saldoApos)}</span></li>
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Seus km nunca vencem. O excedente é cobrado a {formatarBRL(TARIFA_EXCEDENTE_KM)}/km + taxa de {formatarBRL(taxa)}.
                </p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="surface-luxe h-fit border-border/60 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Resumo de valores</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between text-muted-foreground">
              <span>Corrida ({fkm(distancia)})</span>
              <span className="text-foreground">{formatarBRL(valor)}</span>
            </li>
            <li className="flex justify-between text-muted-foreground">
              <span>Taxa de serviço</span>
              <span className="text-foreground">{formatarBRL(taxa)}</span>
            </li>
            {usandoCredito ? (
              <li className="flex justify-between text-muted-foreground">
                <span>Carteira ({fkm(cob.coberto)})</span>
                <span className="text-primary">−{formatarBRL(valor + taxa - cob.total)}</span>
              </li>
            ) : null}
            <li className="flex justify-between border-t border-border/70 pt-3 text-muted-foreground">
              <span>Total</span>
              <span className="font-display text-lg text-primary">{formatarBRL(total)}</span>
            </li>
          </ul>
          <Button className="mt-5 w-full" onClick={confirmar} disabled={enviando}>
            {usandoCredito ? `Confirmar com meus km (${fkm(cob.coberto)})` : "Confirmar pagamento"}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
