import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { emailCliente } from "@/lib/carteira-km";
import { formatarBRL } from "@/lib/dados";
import { gerarPixMercadoPago, verificarPixMercadoPago } from "@/lib/mercadopago.functions";
import { CICLOS, bonusPercentual, rotuloCiclo, validadeCiclo, type Ciclo } from "@/lib/pacotes";

export const Route = createFileRoute("/cliente/pacotes")({
  head: () => ({
    meta: [
      { title: "Pacotes de créditos — seuchauffeur" },
      { name: "description", content: "Compre créditos em pacotes Diário, Semanal, Quinzenal ou Mensal para usar nas suas corridas." },
      { property: "og:title", content: "Pacotes de créditos — seuchauffeur" },
      { property: "og:description", content: "Créditos em km por ciclo de pagamento, liberados após o pagamento aprovado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pacotes,
});

type Pacote = { id: string; nome: string; ciclo: Ciclo; saldo: number; valor: number };
type CicloCfg = { ciclo: Ciclo; preco_km: number; km_minimo: number };

function Pacotes() {
  const [email, setEmail] = useState("");
  const [ciclo, setCiclo] = useState<Ciclo>("semanal");
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [cfg, setCfg] = useState<CicloCfg[]>([]);
  const [valorLivre, setValorLivre] = useState(100);
  const [pedido, setPedido] = useState<{ id: string; saldo: number; valor: number } | null>(null);
  const [pix, setPix] = useState<{ pagamentoId: string; copiaECola: string; qrBase64: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    setEmail(emailCliente());
    void (async () => {
      const [p, c] = await Promise.all([
        supabase.from("pacotes_creditos").select("*").eq("ativo", true).order("valor"),
        supabase.from("ciclos_credito").select("*"),
      ]);
      setPacotes((p.data ?? []).map((x) => ({ id: x.id, nome: x.nome, ciclo: x.ciclo as Ciclo, saldo: Math.max(Number(x.saldo_credito), Number(x.valor)), valor: Number(x.valor) })));
      setCfg((c.data ?? []).map((x) => ({ ciclo: x.ciclo as Ciclo, preco_km: Number(x.preco_km), km_minimo: Number(x.km_minimo) })));
    })();
  }, []);

  const atual = cfg.find((c) => c.ciclo === ciclo);
  const lista = pacotes.filter((p) => p.ciclo === ciclo);
  const minimo = atual ? Math.round(atual.km_minimo * atual.preco_km * 100) / 100 : 0;

  const comprar = async (pacoteId: string | null) => {
    if (!email.includes("@")) { toast.error("Informe seu e-mail de cadastro."); return; }
    setOcupado(true);
    const { data, error } = await supabase.rpc("criar_pedido_pacote", { _email: email, _pacote: pacoteId as string, _ciclo: ciclo, _km: valorLivre });
    if (error) { setOcupado(false); toast.error(error.message); return; }
    const d = data as { id: string; saldo: number; valor: number };
    setPedido(d);
    try {
      setPix(await gerarPixMercadoPago({ data: { tipo: "assinatura", id: d.id } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o Pix.");
    } finally { setOcupado(false); }
  };

  const verificar = async () => {
    if (!pedido) return;
    if (pix) await verificarPixMercadoPago({ data: { pagamentoId: pix.pagamentoId } }).catch(() => null);
    const { data } = await supabase.rpc("status_pedido_assinatura", { _id: pedido.id, _email: email });
    if (data === "aprovado") toast.success("Pagamento aprovado! Seus créditos já estão disponíveis.");
    else toast.info("Pagamento ainda não confirmado. Os créditos entram assim que o banco aprovar.");
  };

  if (pedido) {
    return (
      <AppShell titulo="Pagamento do pacote" descricao="Os créditos só são liberados depois do pagamento aprovado.">
        <Card className="surface-luxe mx-auto max-w-md space-y-4 border-border/60 p-6 text-center">
          <p className="text-sm text-muted-foreground">{rotuloCiclo[ciclo]} · {formatarBRL(pedido.saldo)} em créditos</p>
          <p className="font-display text-3xl text-gold">{formatarBRL(pedido.valor)}</p>
          {pix ? (
            <>
              <img src={`data:image/png;base64,${pix.qrBase64}`} alt="QR Code Pix" className="mx-auto size-48 rounded bg-foreground p-2" />
              <Button variant="outline" className="w-full" onClick={() => { void navigator.clipboard.writeText(pix.copiaECola); toast.success("Código Pix copiado."); }}>Copiar código Pix</Button>
            </>
          ) : <p className="text-sm text-muted-foreground">Pedido registrado. O Pix não pôde ser gerado agora.</p>}
          <Button className="w-full" onClick={verificar}>Já paguei</Button>
          <Button variant="ghost" className="w-full" onClick={() => { setPedido(null); setPix(null); }}>Voltar</Button>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell titulo="Pacotes de créditos" descricao="Pague o pacote e ganhe saldo extra em créditos. Cada corrida desconta o valor da modalidade escolhida.">
      <Card className="mb-6 border-border/60 p-5">
        <Label htmlFor="email-pac">Seu e-mail de cadastro</Label>
        <Input id="email-pac" type="email" className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CICLOS.map((c) => (
          <Button key={c} variant={c === ciclo ? "default" : "outline"} className="h-auto flex-col py-3" onClick={() => setCiclo(c)}>
            <span className="font-display">{rotuloCiclo[c]}</span>
            <span className="text-xs opacity-80">vale {validadeCiclo[c]}</span>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {lista.map((p) => (
          <Card key={p.id} className="surface-luxe flex flex-col gap-3 border-border/60 p-5">
            <p className="font-display text-lg">{p.nome}</p>
            <p className="text-sm text-muted-foreground">Pague</p>
            <p className="font-display text-2xl">{formatarBRL(p.valor)}</p>
            <p className="text-sm text-muted-foreground">e ganhe <span className="font-display text-xl text-gold">{formatarBRL(p.saldo)}</span> em créditos</p>
            {bonusPercentual(p.valor, p.saldo) > 0 && <p className="text-xs font-medium text-gold">+{bonusPercentual(p.valor, p.saldo)}% de bônus · vale {validadeCiclo[p.ciclo]}</p>}
            <Button disabled={ocupado} onClick={() => comprar(p.id)}>Comprar pacote</Button>
          </Card>
        ))}

        {atual && (
          <Card className="flex flex-col gap-3 border-primary/40 p-5">
            <p className="font-display text-lg">Personalizado {rotuloCiclo[ciclo]}</p>
            <Label htmlFor="valor-livre">Quanto quer carregar (R$)?</Label>
            <Input id="valor-livre" type="number" min={minimo} step="0.01" value={valorLivre} onChange={(e) => setValorLivre(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Mínimo {formatarBRL(minimo)} · sem bônus · vale {validadeCiclo[ciclo]}</p>
            <Button disabled={ocupado || valorLivre < minimo} onClick={() => comprar(null)}>Carregar {formatarBRL(valorLivre)}</Button>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
