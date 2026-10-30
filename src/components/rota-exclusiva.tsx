import { useEffect, useState } from "react";
import { Crown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoMoeda } from "@/components/campo-moeda";
import { supabase } from "@/integrations/supabase/client";
import { formatarBRL } from "@/lib/dados";

type Plano = {
  id: string; cliente_email: string; nome: string; origem_fixa: string; destino_fixo: string;
  valor_trecho_fixo: number; viagens_inclusas: number; valor_mensal: number; por_km_variado: number;
  forma_pagamento: string; observacao: string | null; ativo: boolean;
};

const FORMAS: Record<string, string> = {
  pre_pago: "Pré-pago (Pix/cartão no app)",
  faturado_mensal: "Faturamento mensal (pós-pago)",
  faturado_quinzenal: "Faturamento quinzenal (pós-pago)",
};

const VAZIO = {
  cliente_email: "", nome: "Rota Exclusiva", origem_fixa: "", destino_fixo: "",
  valor_trecho_fixo: 0, viagens_inclusas: 0, valor_mensal: 0, por_km_variado: 0,
  forma_pagamento: "pre_pago", observacao: "", ativo: true,
};

export function AdminRotaExclusiva() {
  const [lista, setLista] = useState<Plano[]>([]);
  const [f, setF] = useState({ ...VAZIO });
  const [editando, setEditando] = useState<string | null>(null);
  const set = (k: keyof typeof VAZIO, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const carregar = async () => {
    const { data } = await supabase.from("planos_rota_exclusiva").select("*").order("criado_em", { ascending: false });
    setLista((data ?? []) as Plano[]);
  };
  useEffect(() => { void carregar(); }, []);

  const salvar = async () => {
    if (!f.cliente_email.includes("@")) { toast.error("Informe o e-mail do cliente."); return; }
    if (!f.origem_fixa || !f.destino_fixo) { toast.error("Informe origem e destino fixos."); return; }
    const { data: u } = await supabase.auth.getUser();
    const linha = { ...f, cliente_email: f.cliente_email.trim().toLowerCase(), observacao: f.observacao || null, atualizado_em: new Date().toISOString() };
    const { error } = editando
      ? await supabase.from("planos_rota_exclusiva").update(linha).eq("id", editando)
      : await supabase.from("planos_rota_exclusiva").insert({ ...linha, criado_por: u.user?.email ?? null });
    if (error) { toast.error("Não foi possível salvar: " + error.message); return; }
    toast.success("Plano Rota Exclusiva salvo.");
    setF({ ...VAZIO }); setEditando(null); void carregar();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este plano exclusivo?")) return;
    const { error } = await supabase.from("planos_rota_exclusiva").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void carregar();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="surface-luxe border-border/60 p-6 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {editando ? "Editar Rota Exclusiva" : "Nova Rota Exclusiva"}
        </h2>
        <p className="text-xs text-muted-foreground">Plano sob medida para um único cliente. Não aparece na vitrine.</p>
        <div className="space-y-1"><Label>E-mail do cliente</Label><Input value={f.cliente_email} onChange={(e) => set("cliente_email", e.target.value)} /></div>
        <div className="space-y-1"><Label>Nome do plano</Label><Input value={f.nome} onChange={(e) => set("nome", e.target.value)} /></div>
        <div className="space-y-1"><Label>Origem fixa</Label><Input value={f.origem_fixa} onChange={(e) => set("origem_fixa", e.target.value)} /></div>
        <div className="space-y-1"><Label>Destino fixo</Label><Input value={f.destino_fixo} onChange={(e) => set("destino_fixo", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Valor por trecho fixo</Label><CampoMoeda valor={f.valor_trecho_fixo} onChange={(v) => set("valor_trecho_fixo", v)} /></div>
          <div className="space-y-1"><Label>Viagens inclusas/mês</Label><Input type="number" min={0} value={f.viagens_inclusas} onChange={(e) => set("viagens_inclusas", Number(e.target.value))} /></div>
          <div className="space-y-1"><Label>Mensalidade (opcional)</Label><CampoMoeda valor={f.valor_mensal} onChange={(v) => set("valor_mensal", v)} /></div>
          <div className="space-y-1"><Label>R$/km pontos variados</Label><CampoMoeda valor={f.por_km_variado} onChange={(v) => set("por_km_variado", v)} /></div>
        </div>
        <div className="space-y-1">
          <Label>Forma de pagamento</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.forma_pagamento} onChange={(e) => set("forma_pagamento", e.target.value)}>
            {Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="space-y-1"><Label>Observação</Label><Input value={f.observacao ?? ""} onChange={(e) => set("observacao", e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.ativo} onChange={(e) => set("ativo", e.target.checked)} /> Ativo</label>
        <div className="flex gap-2">
          <Button onClick={salvar}>Salvar</Button>
          {editando && <Button variant="secondary" onClick={() => { setEditando(null); setF({ ...VAZIO }); }}>Cancelar</Button>}
        </div>
      </Card>
      <div className="space-y-3">
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum plano exclusivo cadastrado.</p>}
        {lista.map((p) => (
          <Card key={p.id} className="surface-luxe border-border/60 p-4 flex justify-between gap-4">
            <div className="text-sm space-y-1">
              <p className="font-medium text-gold">{p.nome} {!p.ativo && <span className="text-muted-foreground">(inativo)</span>}</p>
              <p className="text-muted-foreground">{p.cliente_email}</p>
              <p>{p.origem_fixa} ⇄ {p.destino_fixo}: {formatarBRL(p.valor_trecho_fixo)}/trecho · {p.viagens_inclusas} viagens/mês</p>
              <p>Variados: {formatarBRL(p.por_km_variado)}/km · {FORMAS[p.forma_pagamento] ?? p.forma_pagamento}</p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setEditando(p.id); setF({ ...VAZIO, ...p, observacao: p.observacao ?? "" }); }}><Pencil /></Button>
              <Button size="icon" variant="ghost" onClick={() => excluir(p.id)}><Trash2 /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function RotaExclusivaCliente() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  useEffect(() => {
    void supabase.from("planos_rota_exclusiva").select("*").eq("ativo", true).then(({ data }) => setPlanos((data ?? []) as Plano[]));
  }, []);
  if (planos.length === 0) return null;
  return (
    <>
      {planos.map((p) => (
        <Card key={p.id} className="surface-luxe glow-gold border-border/60 p-5 space-y-2">
          <p className="flex items-center gap-2 text-gold font-medium"><Crown className="h-4 w-4" /> Seu plano {p.nome}</p>
          <p className="text-sm">Rota habitual: {p.origem_fixa} ⇄ {p.destino_fixo} — <strong>{formatarBRL(p.valor_trecho_fixo)}</strong> por trecho{p.viagens_inclusas > 0 ? ` · ${p.viagens_inclusas} viagens/mês` : ""}</p>
          {p.valor_mensal > 0 && <p className="text-sm">Mensalidade: {formatarBRL(p.valor_mensal)}</p>}
          <p className="text-sm">Outros destinos: tarifa sob medida de <strong>{formatarBRL(p.por_km_variado)}/km</strong></p>
          <p className="text-xs text-muted-foreground">Pagamento: {FORMAS[p.forma_pagamento] ?? p.forma_pagamento}</p>
        </Card>
      ))}
    </>
  );
}
