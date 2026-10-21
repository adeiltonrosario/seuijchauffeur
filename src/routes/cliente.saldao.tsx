import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Tag } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LoginCliente } from "@/components/login-cliente";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatarBRL } from "@/lib/dados";
import { descontoPercentual, erroQuantidade, MINUTOS_RESERVA, minutosRestantes, rotuloStatusCompra, valorCompra } from "@/lib/saldao";

export const Route = createFileRoute("/cliente/saldao")({
  head: () => ({
    meta: [
      { title: "Saldão de créditos — seuchauffeur" },
      { name: "description", content: "Ofertas de créditos bônus com preço promocional para suas viagens." },
      { property: "og:title", content: "Saldão de créditos — seuchauffeur" },
      { property: "og:description", content: "Compre créditos de viagem com desconto enquanto durar a oferta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Saldao,
});

type Oferta = { id: string; titulo: string; disponivel: number; quantidade_total: number; preco_unitario: number; validade_dias: number; termina_em: string | null };
type Compra = { id: string; titulo: string; quantidade: number; valor: number; status: string; reserva_expira_em: string; criado_em: string };

function CartaoOferta({ o, logado, aoReservar }: { o: Oferta; logado: boolean; aoReservar: () => void }) {
  const [qtd, setQtd] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const n = Number(qtd);
  const erro = qtd ? erroQuantidade(n, Number(o.disponivel)) : null;
  const desconto = descontoPercentual(Number(o.preco_unitario));

  async function reservar() {
    setOcupado(true);
    const { data, error } = await supabase.rpc("reservar_compra_saldao", { _oferta: o.id, _quantidade: n });
    setOcupado(false);
    const r = data as unknown as { ok: boolean; erro?: string } | null;
    if (error || !r?.ok) { toast.error(r?.erro ?? "Não foi possível reservar."); return; }
    toast.success(`Reserva feita por ${MINUTOS_RESERVA} minutos.`);
    setQtd("");
    aoReservar();
  }

  return (
    <Card className="surface-luxe space-y-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lg text-gold">{o.titulo}</h3>
        {desconto > 0 && <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs text-primary">{desconto}% off</span>}
      </div>
      <p className="text-2xl font-semibold">{formatarBRL(Number(o.preco_unitario))} <span className="text-sm font-normal text-muted-foreground">por crédito</span></p>
      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>{Number(o.disponivel).toLocaleString("pt-BR")} créditos disponíveis</li>
        <li>Os créditos valem {o.validade_dias} dias depois de liberados</li>
        {o.termina_em && <li>Oferta até {new Date(o.termina_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</li>}
      </ul>
      {logado ? (
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1"><Label>Quantos créditos?</Label><Input inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value.replace(/\D/g, ""))} placeholder="Ex.: 20" /></div>
            <Button disabled={!qtd || !!erro || ocupado} onClick={reservar}>Reservar</Button>
          </div>
          {qtd && (erro ? <p className="text-sm text-destructive">{erro}</p> : <p className="text-sm">Total: <b>{formatarBRL(valorCompra(n, Number(o.preco_unitario)))}</b></p>)}
        </div>
      ) : <p className="text-sm text-muted-foreground">Entre na sua conta, abaixo, para comprar.</p>}
    </Card>
  );
}

function Saldao() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [pronto, setPronto] = useState(false);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    supabase.auth.getSession().then(({ data }) => { setSessao(data.session); setPronto(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function carregar() {
    const { data } = await supabase.rpc("vitrine_saldao");
    setOfertas((data as unknown as Oferta[]) ?? []);
    if (sessao) {
      const { data: c } = await supabase.rpc("minhas_compras_saldao");
      setCompras((c as unknown as Compra[]) ?? []);
    } else setCompras([]);
  }
  useEffect(() => { void carregar(); }, [sessao?.user.email]); // eslint-disable-line react-hooks/exhaustive-deps

  async function cancelar(id: string) {
    const { data } = await supabase.rpc("cancelar_compra_saldao", { _compra: id });
    const r = data as unknown as { ok: boolean; erro?: string } | null;
    if (!r?.ok) { toast.error(r?.erro ?? "Não foi possível cancelar."); return; }
    toast.success("Reserva cancelada.");
    void carregar();
  }

  return (
    <AppShell titulo="Saldão de créditos" descricao="Créditos bônus com preço promocional, enquanto durar a oferta.">
      <div className="space-y-6">
        {ofertas.length === 0 ? (
          <Card className="border-border/60 p-6 text-sm text-muted-foreground">
            <Tag className="mb-2 size-5 text-primary" />
            Nenhuma oferta no momento. Volte em breve.
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ofertas.map((o) => <CartaoOferta key={o.id} o={o} logado={!!sessao} aoReservar={carregar} />)}
          </div>
        )}

        <Card className="border-border/60 p-4 text-sm text-muted-foreground">
          Ao reservar, a quantidade fica guardada para você por {MINUTOS_RESERVA} minutos. Os créditos só entram na sua carteira depois que o pagamento for aprovado. Se o pagamento não chegar a tempo, a reserva é desfeita sozinha.
        </Card>

        {pronto && !sessao && <LoginCliente voltarPara="/cliente/saldao" titulo="Entrar para comprar no Saldão" />}

        {sessao && (
          <Card className="surface-luxe p-6">
            <div className="mb-3 flex items-center justify-between text-sm">
              <h2 className="text-lg font-semibold text-gold">Minhas compras</h2>
              <span className="text-muted-foreground">{sessao.user.email}</span>
            </div>
            {compras.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma compra ainda.</p> : (
              <ul className="divide-y divide-border/60 text-sm">
                {compras.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p>{c.titulo} · {Number(c.quantidade).toLocaleString("pt-BR")} créditos · <b>{formatarBRL(Number(c.valor))}</b></p>
                      <p className="text-xs text-muted-foreground">
                        {rotuloStatusCompra[c.status] ?? c.status}
                        {c.status === "aguardando_pagamento" && ` · vence em ${minutosRestantes(c.reserva_expira_em)} min`}
                      </p>
                    </div>
                    {c.status === "aguardando_pagamento" && <Button size="sm" variant="outline" onClick={() => cancelar(c.id)}>Cancelar</Button>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">O pagamento online ainda está sendo ligado. Até lá, as reservas ficam aguardando pagamento.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
