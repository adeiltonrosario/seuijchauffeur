import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoMoeda } from "@/components/campo-moeda";
import { CICLOS, rotuloCiclo, validadeCiclo, type Ciclo } from "@/lib/pacotes";

type Pacote = { id?: string; nome: string; ciclo: Ciclo; km: number; valor: number; ativo: boolean };
type CicloCfg = { ciclo: Ciclo; preco_km: number; km_minimo: number };

export function PacotesCreditosAdmin() {
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [ciclos, setCiclos] = useState<CicloCfg[]>([]);

  const carregar = async () => {
    const [p, c] = await Promise.all([
      supabase.from("pacotes_creditos").select("*").order("criado_em"),
      supabase.from("ciclos_credito").select("*"),
    ]);
    setPacotes((p.data ?? []).map((x) => ({ ...x, ciclo: x.ciclo as Ciclo, km: Number(x.km), valor: Number(x.valor) })));
    setCiclos(CICLOS.map((k) => {
      const r = (c.data ?? []).find((x) => x.ciclo === k);
      return { ciclo: k, preco_km: Number(r?.preco_km ?? 2.2), km_minimo: Number(r?.km_minimo ?? 10) };
    }));
  };
  useEffect(() => { void carregar(); }, []);

  const salvar = async (p: Pacote) => {
    if (!p.nome.trim() || p.km <= 0 || p.valor <= 0) { toast.error("Preencha nome, km e valor."); return; }
    const dados = { nome: p.nome, ciclo: p.ciclo, km: p.km, valor: p.valor, ativo: p.ativo };
    const { error } = p.id
      ? await supabase.from("pacotes_creditos").update(dados).eq("id", p.id)
      : await supabase.from("pacotes_creditos").insert(dados);
    if (error) { toast.error("Não foi possível salvar: " + error.message); return; }
    toast.success("Pacote salvo.");
    void carregar();
  };
  const excluir = async (p: Pacote) => {
    if (!p.id) { setPacotes((l) => l.filter((x) => x !== p)); return; }
    const { error } = await supabase.from("pacotes_creditos").delete().eq("id", p.id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    toast.success("Pacote excluído.");
    void carregar();
  };
  const salvarCiclo = async (c: CicloCfg) => {
    const { error } = await supabase.from("ciclos_credito").upsert({ ...c, atualizado_em: new Date().toISOString() });
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success(`Ciclo ${rotuloCiclo[c.ciclo]} salvo.`);
  };
  const muda = (i: number, d: Partial<Pacote>) => setPacotes((l) => l.map((x, j) => (j === i ? { ...x, ...d } : x)));

  return (
    <div className="space-y-6">
      <Card className="border-border/60 p-5">
        <h3 className="font-display text-lg">Pacote personalizado — preço por km em cada ciclo</h3>
        <p className="mb-4 text-sm text-muted-foreground">O cliente escolhe quantos km quer; 1 km = 1 crédito. Os créditos vencem no fim do ciclo.</p>
        <div className="grid gap-4 md:grid-cols-4">
          {ciclos.map((c, i) => (
            <div key={c.ciclo} className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="font-medium text-gold">{rotuloCiclo[c.ciclo]} <span className="text-xs text-muted-foreground">({validadeCiclo[c.ciclo]})</span></p>
              <Label>Preço por km</Label>
              <CampoMoeda valor={c.preco_km} aoMudar={(v) => setCiclos((l) => l.map((x, j) => (j === i ? { ...x, preco_km: v } : x)))} />
              <Label>Mínimo de km</Label>
              <Input type="number" value={c.km_minimo} onChange={(e) => setCiclos((l) => l.map((x, j) => (j === i ? { ...x, km_minimo: Number(e.target.value) } : x)))} />
              <Button size="sm" className="w-full" onClick={() => salvarCiclo(c)}><Save className="size-4" /> Salvar</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-border/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg">Pacotes prontos</h3>
          <Button size="sm" onClick={() => setPacotes((l) => [...l, { nome: "Novo pacote", ciclo: "semanal", km: 100, valor: 200, ativo: true }])}><Plus className="size-4" /> Novo pacote</Button>
        </div>
        <div className="space-y-3">
          {pacotes.map((p, i) => (
            <div key={p.id ?? `novo-${i}`} className="grid items-end gap-3 rounded-lg border border-border/60 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
              <div className="space-y-1"><Label>Nome</Label><Input value={p.nome} onChange={(e) => muda(i, { nome: e.target.value })} /></div>
              <div className="space-y-1"><Label>Pagamento</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={p.ciclo} onChange={(e) => muda(i, { ciclo: e.target.value as Ciclo })}>
                  {CICLOS.map((c) => <option key={c} value={c}>{rotuloCiclo[c]}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Km (créditos)</Label><Input type="number" value={p.km} onChange={(e) => muda(i, { km: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>Valor</Label><CampoMoeda valor={p.valor} aoMudar={(v) => muda(i, { valor: v })} /></div>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={p.ativo} onChange={(e) => muda(i, { ativo: e.target.checked })} /> Ativo</label>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => salvar(p)}><Save className="size-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => excluir(p)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
          {pacotes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pacote cadastrado.</p>}
        </div>
      </Card>
    </div>
  );
}
