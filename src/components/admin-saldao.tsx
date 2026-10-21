import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CampoMoeda } from "@/components/campo-moeda";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatarBRL } from "@/lib/dados";
import { rotuloStatusCompra } from "@/lib/saldao";

type Oferta = {
  id: string; titulo: string; quantidade_total: number; disponivel: number; preco_unitario: number; validade_dias: number;
  status: string; termina_em: string | null; reservado: number; vendido: number; receita: number;
};
type Compra = { id: string; titulo: string; cliente_email: string; quantidade: number; valor: number; status: string; criado_em: string };

export function AdminSaldao() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [estoque, setEstoque] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [qtd, setQtd] = useState("");
  const [preco, setPreco] = useState(0.7);
  const [validade, setValidade] = useState("30");
  const [termino, setTermino] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    await supabase.rpc("liberar_reservas_saldao");
    const [p, c] = await Promise.all([supabase.rpc("painel_saldao_admin"), supabase.rpc("painel_carteira_admin")]);
    if (p.error) { toast.error("Entre como Administrador ou Gerente para ver o Saldão."); return; }
    const d = p.data as unknown as { ofertas: Oferta[]; compras: Compra[] };
    setOfertas(d.ofertas); setCompras(d.compras);
    setEstoque(Number((c.data as unknown as { disponivel: number } | null)?.disponivel ?? 0));
  }
  useEffect(() => { void carregar(); }, []);

  async function criar() {
    setOcupado(true);
    const { data, error } = await supabase.rpc("criar_oferta_saldao", {
      _titulo: titulo, _quantidade: Number(qtd), _preco_unitario: preco, _validade_dias: Number(validade),
      _termina_em: termino ? new Date(termino).toISOString() : (null as unknown as string),
    });
    setOcupado(false);
    const r = data as unknown as { ok: boolean; erro?: string } | null;
    if (error || !r?.ok) { toast.error(r?.erro ?? "Não foi possível criar a oferta."); return; }
    toast.success("Oferta publicada no Saldão.");
    setTitulo(""); setQtd(""); setTermino("");
    void carregar();
  }

  async function encerrar(id: string) {
    if (!confirm("Encerrar esta oferta? O que não foi vendido volta para o estoque.")) return;
    const { data } = await supabase.rpc("encerrar_oferta_saldao", { _oferta: id });
    if (!(data as unknown as { ok: boolean } | null)?.ok) { toast.error("Não foi possível encerrar."); return; }
    toast.success("Oferta encerrada.");
    void carregar();
  }

  return (
    <div className="space-y-6">
      <Card className="surface-luxe space-y-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg text-gold">Nova oferta</h3>
          <p className="text-sm text-muted-foreground">Estoque de créditos vencidos disponível: <b className="text-gold">{estoque.toLocaleString("pt-BR")}</b></p>
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2"><Label>Nome da oferta</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Saldão de outubro" /></div>
          <div><Label>Quantidade de créditos</Label><Input inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value.replace(/\D/g, ""))} /></div>
          <div><Label>Preço por crédito</Label><CampoMoeda valor={preco} aoMudar={setPreco} /></div>
          <div><Label>Validade (dias)</Label><Input inputMode="numeric" value={validade} onChange={(e) => setValidade(e.target.value.replace(/\D/g, ""))} /></div>
          <div className="sm:col-span-2"><Label>Termina em (opcional)</Label><Input type="datetime-local" value={termino} onChange={(e) => setTermino(e.target.value)} /></div>
        </div>
        <Button onClick={criar} disabled={ocupado || !titulo || !qtd}>Publicar oferta</Button>
        <p className="text-xs text-muted-foreground">A quantidade sai do estoque na hora e fica reservada para a oferta. O cliente só recebe os créditos depois que o pagamento for aprovado.</p>
      </Card>

      <Card className="border-border/60 p-5">
        <h3 className="mb-3 font-display text-lg">Ofertas</h3>
        {ofertas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma oferta criada.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th>Oferta</th><th>Preço</th><th>Disponível</th><th>Reservado</th><th>Vendido</th><th>Recebido</th><th>Situação</th><th /></tr></thead>
              <tbody>{ofertas.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-2">{o.titulo}<div className="text-xs text-muted-foreground">{o.quantidade_total} créditos · valem {o.validade_dias} dias</div></td>
                  <td>{formatarBRL(Number(o.preco_unitario))}</td>
                  <td>{o.disponivel}</td><td>{o.reservado}</td><td>{o.vendido}</td>
                  <td>{formatarBRL(Number(o.receita))}</td>
                  <td>{o.status === "ativa" ? "Ativa" : "Encerrada"}</td>
                  <td>{o.status === "ativa" && <Button size="sm" variant="outline" onClick={() => encerrar(o.id)}>Encerrar</Button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="border-border/60 p-5">
        <h3 className="mb-3 font-display text-lg">Compras dos clientes</h3>
        {compras.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma compra ainda.</p> : (
          <ul className="divide-y divide-border/60 text-sm">
            {compras.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
                <div>
                  <p>{c.cliente_email} · {c.titulo}</p>
                  <p className="text-xs text-muted-foreground">{new Date(c.criado_em).toLocaleString("pt-BR")} · {rotuloStatusCompra[c.status] ?? c.status}</p>
                </div>
                <b>{c.quantidade} créditos · {formatarBRL(Number(c.valor))}</b>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
