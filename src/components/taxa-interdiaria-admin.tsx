import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Percentual embutido no orçamento quando a volta é em outro dia. */
export function TaxaInterdiariaAdmin() {
  const [pct, setPct] = useState("30");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    void supabase.from("credito_config").select("taxa_interdiaria_pct").limit(1).maybeSingle()
      .then(({ data }) => data && setPct(String(data.taxa_interdiaria_pct)));
  }, []);
  const salvar = async () => {
    const v = Number(pct.replace(",", "."));
    if (!Number.isFinite(v) || v < 0 || v > 300) return void toast.error("Informe um percentual entre 0 e 300.");
    setSalvando(true);
    const { error } = await supabase.from("credito_config").update({ taxa_interdiaria_pct: v }).eq("id", true);
    setSalvando(false);
    if (error) toast.error("Não foi possível salvar."); else toast.success("Taxa de deslocamento salva.");
  };
  return (
    <Card className="border-border/60 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Taxa de deslocamento (volta em outro dia)</h2>
      <p className="mt-1 text-sm text-muted-foreground">Percentual embutido no preço quando a ida e a volta são em datas diferentes (ex.: show dia 14, volta dia 15).</p>
      <div className="mt-4 flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="taxa-interdiaria">Adicional (%)</Label>
          <Input id="taxa-interdiaria" className="w-32" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />
        </div>
        <Button onClick={salvar} disabled={salvando}>Salvar</Button>
      </div>
    </Card>
  );
}
