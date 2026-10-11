import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Gift, QrCode } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarBRL } from "@/lib/dados";
import {
  calcularPlano,
  carregarCreditos,
  gerarLotes,
  rotuloPeriodicidade,
  salvarCreditos,
  type Periodicidade,
} from "@/lib/assinaturas";
import { clienteAtual, descontoTitular, meuCodigo, usarCodigo, validarCodigo } from "@/lib/indicacao";
import { valorComIndicacao } from "@/lib/indicacao-preco";
import { supabase } from "@/integrations/supabase/client";

type Busca = { p: Periodicidade; v: number; preco: number; mod?: string | undefined };

export const Route = createFileRoute("/cliente/assinatura")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    p: (["mensal", "trimestral", "anual"].includes(String(s["p"])) ? s["p"] : "mensal") as Periodicidade,
    v: Math.max(1, Number(s["v"]) || 12),
    preco: Math.max(0, Number(s["preco"]) || 150),
    mod: s["mod"] ? String(s["mod"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contratar plano — seuchauffeur" },
      { name: "description", content: "Revise o plano, aplique seu código de indicação e pague para liberar os créditos." },
      { property: "og:title", content: "Contratar plano — seuchauffeur" },
      { property: "og:description", content: "Pagamento do plano de assinatura com desconto de indicação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assinatura,
});

function Assinatura() {
  const { p, v, preco, mod } = Route.useSearch();
  const navigate = useNavigate();
  const plano = calcularPlano(p, v, preco);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [descTitular, setDescTitular] = useState(0);
  const [codigo, setCodigo] = useState("");
  const [codigoOk, setCodigoOk] = useState(false);
  const [etapa, setEtapa] = useState<"revisar" | "pix" | "pago">("revisar");

  useEffect(() => {
    const c = clienteAtual();
    setEmail(c.email);
    setNome(c.nome);
    if (c.email) meuCodigo(c.email, c.nome).then((i) => setDescTitular(descontoTitular(i.usos))).catch(() => {});
  }, []);

  const valores = valorComIndicacao({
    valorTotalCiclo: plano.valorTotalCiclo,
    valorMensal: plano.valorMensalEquivalente,
    descontoTitularPct: descTitular,
    usaCodigoAmigo: codigoOk,
  });

  const aplicar = async () => {
    if (!email.includes("@")) { toast.error("Informe seu e-mail de cadastro."); return; }
    const erro = await validarCodigo(codigo, email);
    if (erro) {
      setCodigoOk(false);
      toast.error(erro); return;
    }
    setCodigoOk(true);
    toast.success("Código aplicado: 10% de desconto na 1ª mensalidade.");
  };

  const [pedidoId, setPedidoId] = useState<string | null>(null);

  const irParaPix = async () => {
    if (!email.includes("@")) { toast.error("Informe seu e-mail de cadastro."); return; }
    const { data, error } = await supabase.rpc("criar_pedido_assinatura", {
      _email: email, _modalidade: mod ?? "", _periodicidade: p,
      _franquia_km: Math.max(1, plano.viagensPorMes * 18), _ciclos: plano.creditosTotais / Math.max(1, plano.viagensPorMes),
      _valor: valores.total, _codigo: codigoOk ? codigo : "",
    });
    if (error) { toast.error("Não foi possível registrar o pedido."); return; }
    setPedidoId(data as string);
    setEtapa("pix");
  };

  // "Já paguei" apenas consulta o status: a liberação só ocorre no servidor após aprovação do Mercado Pago.
  const confirmarPagamento = async () => {
    if (!pedidoId) return;
    const { data } = await supabase.rpc("status_pedido_assinatura", { _id: pedidoId, _email: email });
    if (data === "aprovado") { setEtapa("pago"); toast.success("Pagamento aprovado."); return; }
    toast.info("Pagamento ainda não confirmado pelo banco. Os quilômetros serão liberados automaticamente após a aprovação.");
  };

  return (
    <AppShell titulo={`Plano ${plano.rotulo}`} descricao="Os créditos só são liberados depois do pagamento confirmado.">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="surface-luxe border-border/60 p-6 space-y-5">
          {etapa === "revisar" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email-ass">Seu e-mail de cadastro</Label>
                <Input id="email-ass" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cod" className="flex items-center gap-2">
                  <Gift className="size-4 text-primary" /> Possui código de indicação?
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cod"
                    placeholder="VIP-XXXX"
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(e.target.value.toUpperCase());
                      setCodigoOk(false);
                    }}
                  />
                  <Button variant="secondary" disabled={!codigo} onClick={aplicar}>Aplicar</Button>
                </div>
              </div>
              <Button className="w-full" onClick={() => setEtapa("pix")}>
                <QrCode /> Pagar {formatarBRL(valores.total)} com Pix
              </Button>
            </>
          )}
          {etapa === "pix" && (
            <div className="space-y-4 text-sm">
              <p>Pague <strong className="text-gold">{formatarBRL(valores.total)}</strong> com Pix para a chave pix@seuchauffeur.com.br.</p>
              <p className="text-muted-foreground">
                Pagamento de demonstração: a confirmação automática pelo banco entra quando a conta Mercado Pago for conectada.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEtapa("revisar")}>Voltar</Button>
                <Button onClick={confirmarPagamento}>Já paguei — confirmar</Button>
              </div>
            </div>
          )}
          {etapa === "pago" && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-lg"><CheckCircle2 className="text-primary" /> Plano ativo!</p>
              <p className="text-sm text-muted-foreground">{plano.creditosTotais} créditos de viagem foram liberados.</p>
              <Button onClick={() => navigate({ to: "/cliente" })}>Ir para minha área</Button>
            </div>
          )}
        </Card>
        <Card className="h-fit border-border/60 p-5 text-sm space-y-2">
          <h2 className="font-display text-base font-semibold">Resumo</h2>
          {mod && <p>Modalidade: {mod}</p>}
          <p>{rotuloPeriodicidade[p]} · {plano.viagensPorMes} viagens/mês · {plano.creditosTotais} créditos</p>
          <p>Valor do plano: {formatarBRL(plano.valorTotalCiclo)}</p>
          {valores.descontoTitular > 0 && <p className="text-primary">Suas indicações ({descTitular}%): −{formatarBRL(valores.descontoTitular)}</p>}
          {valores.descontoAmigo > 0 && <p className="text-primary">Código de amigo (10% 1ª mensalidade): −{formatarBRL(valores.descontoAmigo)}</p>}
          <p className="border-t border-border pt-2 text-base">Total: <strong className="text-gold">{formatarBRL(valores.total)}</strong></p>
        </Card>
      </div>
    </AppShell>
  );
}
