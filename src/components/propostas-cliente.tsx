import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Gift, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatarBRL } from "@/lib/dados";
import { gerarPixMercadoPago, verificarPixMercadoPago } from "@/lib/mercadopago.functions";

type Proposta = {
  id: string; modalidade: string; periodicidade: string; viagens_mes: number;
  franquia_km: number; valor: number; observacao: string | null; status: string;
};
type Pix = { pagamentoId: string; copiaECola: string; qrBase64: string };

/** Propostas personalizadas enviadas pela equipe ao cliente logado. */
export function PropostasCliente() {
  const [lista, setLista] = useState<Proposta[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const [pedido, setPedido] = useState<string | null>(null);
  const [pix, setPix] = useState<Pix | null>(null);
  const [gerando, setGerando] = useState(false);

  const carregar = async () => {
    const { data } = await supabase.from("propostas_plano").select("*")
      .in("status", ["enviada", "aguardando_pagamento", "paga"]).order("criado_em", { ascending: false });
    setLista((data ?? []) as Proposta[]);
  };
  useEffect(() => { void carregar(); }, []);

  useEffect(() => {
    if (!pix) return;
    const t = setInterval(async () => {
      await verificarPixMercadoPago({ data: { pagamentoId: pix.pagamentoId } }).catch(() => null);
      const { data } = await supabase.from("propostas_plano").select("status").eq("id", aberta ?? "").maybeSingle();
      if (data?.status === "paga") { toast.success("Pagamento aprovado! Créditos liberados."); setPix(null); setAberta(null); void carregar(); }
    }, 8000);
    return () => clearInterval(t);
  }, [pix, aberta]);

  const pagarPix = async (id: string) => {
    setGerando(true); setAberta(id);
    try {
      const { data: pid, error } = await supabase.rpc("pagar_proposta", { _proposta: id });
      if (error || !pid) throw new Error(error?.message ?? "Falha ao abrir pedido");
      setPedido(pid);
      setPix(await gerarPixMercadoPago({ data: { tipo: "assinatura", id: pid } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o Pix.");
      setAberta(null);
    } finally { setGerando(false); }
  };

  if (!lista.length) return null;
  return (
    <div className="space-y-3">
      {lista.map((p) => (
        <Card key={p.id} className="surface-luxe glow-gold border-primary/40 p-5">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
            <Gift className="size-4" /> {p.status === "paga" ? "Plano ativo" : "Proposta personalizada recebida"}
          </p>
          <p className="mt-2 font-display text-lg">{p.modalidade} · Plano {p.periodicidade}</p>
          <p className="text-sm text-muted-foreground">
            {p.viagens_mes ? `${p.viagens_mes} viagens/mês · ` : ""}{p.franquia_km} km · <span className="text-gold">{formatarBRL(Number(p.valor))}</span>
          </p>
          {p.observacao && <p className="mt-1 text-xs text-muted-foreground">{p.observacao}</p>}
          {p.status === "paga" ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="size-4" /> Pago — créditos liberados.</p>
          ) : aberta === p.id && pix ? (
            <div className="mt-4 space-y-3 text-sm">
              {pix.qrBase64 && <img src={`data:image/png;base64,${pix.qrBase64}`} alt="QR Code Pix" className="mx-auto size-52 rounded-md bg-card p-2" />}
              <Button variant="secondary" className="w-full" onClick={() => { void navigator.clipboard.writeText(pix.copiaECola); toast.success("Código Pix copiado."); }}>
                Copiar código Pix
              </Button>
              <p className="text-xs text-muted-foreground">Assim que o pagamento for confirmado, os créditos entram sozinhos na sua carteira.</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={gerando} onClick={() => pagarPix(p.id)}>
                <QrCode /> {gerando && aberta === p.id ? "Gerando Pix..." : "Pagar com Pix"}
              </Button>
              <Button variant="secondary" disabled onClick={() => undefined}>
                <CreditCard /> Cartão e Mobilidade (em breve)
              </Button>
            </div>
          )}
          {pedido && aberta === p.id ? null : null}
        </Card>
      ))}
    </div>
  );
}
