import { useEffect, useState } from "react";
import { QrCode, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PIX_VAZIO, carregarChavePix, type ChavePix } from "@/lib/chave-pix";

const TIPOS = ["CNPJ", "CPF", "E-mail", "Celular", "Chave aleatória"];

export function ChavePixAdmin() {
  const [pix, setPix] = useState<ChavePix>(PIX_VAZIO);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { void carregarChavePix().then(setPix); }, []);
  const set = (k: keyof ChavePix) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setPix({ ...pix, [k]: e.target.value });

  const salvar = async () => {
    if (pix.chave.trim().length < 5) return void toast.error("Informe a chave Pix.");
    if (pix.titular.trim().length < 3) return void toast.error("Informe o nome do titular.");
    setSalvando(true);
    const { error } = await supabase.from("config_pix").upsert({ id: true, ...pix, chave: pix.chave.trim(), atualizado_em: new Date().toISOString() });
    setSalvando(false);
    if (error) toast.error("Não foi possível salvar. Apenas Administrador ou Gerente podem alterar.");
    else toast.success("Chave Pix da empresa salva.");
  };

  return (
    <Card className="surface-luxe glow-gold border-primary/40 p-6 lg:col-span-2">
      <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        <QrCode className="size-4 text-primary" /> Chave Pix da empresa para recebimentos
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Todos os pagamentos dos clientes (orçamentos, corridas e pacotes) serão feitos para esta chave enquanto o Mercado Pago não estiver ligado.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pix-tipo">Tipo de chave</Label>
          <select id="pix-tipo" value={pix.tipo} onChange={set("tipo")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-2"><Label htmlFor="pix-chave">Chave Pix</Label><Input id="pix-chave" value={pix.chave} onChange={set("chave")} /></div>
        <div className="space-y-2"><Label htmlFor="pix-titular">Nome do titular / Razão social</Label><Input id="pix-titular" value={pix.titular} onChange={set("titular")} /></div>
        <div className="space-y-2"><Label htmlFor="pix-banco">Banco / Instituição</Label><Input id="pix-banco" value={pix.banco} onChange={set("banco")} /></div>
      </div>
      <Button className="mt-5" disabled={salvando} onClick={salvar}><Save /> {salvando ? "Salvando..." : "Salvar chave Pix"}</Button>
    </Card>
  );
}
