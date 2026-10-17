import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TARIFA_KM_MINIMA, VEICULOS, type Veiculo } from "@/lib/translado-esportivo";
import { carregarPrecosEsportivo, salvarPrecosEsportivo, type PrecoEsportivo } from "@/lib/precos-esportivo";

const ORDEM: Veiculo[] = ["carro", "minivan", "van"];

export function AdminPrecosEsportivo() {
  const [lista, setLista] = useState<PrecoEsportivo[]>(
    ORDEM.map((v) => ({ veiculo: v, valorEvento: VEICULOS[v].valorEvento, porKm: 3 })),
  );
  useEffect(() => {
    void carregarPrecosEsportivo().then((r) => r && setLista(ORDEM.map((v) => r[v] ?? { veiculo: v, valorEvento: VEICULOS[v].valorEvento, porKm: 3 })));
  }, []);
  const mudar = (i: number, campo: "valorEvento" | "porKm", valor: string) =>
    setLista((a) => a.map((p, k) => (k === i ? { ...p, [campo]: Number(valor.replace(",", ".")) || 0 } : p)));
  const salvar = async () => {
    if (lista.some((p) => p.valorEvento <= 0 || p.porKm < TARIFA_KM_MINIMA)) {
      toast.error(`Valor por evento deve ser maior que zero e o km no mínimo R$ ${TARIFA_KM_MINIMA.toFixed(2)}.`);
      return;
    }
    if (await salvarPrecosEsportivo(lista)) toast.success("Valores do Translado Esportivo salvos.");
    else toast.error("Não foi possível salvar: entre como Administrador ou Gerente.");
  };
  return (
    <Card className="surface-luxe border-border/60 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Translado Esportivo — valores por veículo
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Os planos Mensal, Trimestral e Anual desta modalidade ficam na aba Assinaturas.
      </p>
      <div className="mt-4 space-y-3">
        {lista.map((p, i) => (
          <div key={p.veiculo} className="grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-3 sm:items-end">
            <p className="text-sm text-gold">{VEICULOS[p.veiculo].nome} ({VEICULOS[p.veiculo].min}–{VEICULOS[p.veiculo].max})</p>
            <div className="space-y-1">
              <Label htmlFor={`ev-${p.veiculo}`}>Valor por evento (R$)</Label>
              <Input id={`ev-${p.veiculo}`} inputMode="decimal" value={p.valorEvento} onChange={(e) => mudar(i, "valorEvento", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`km-${p.veiculo}`}>Valor por km (R$)</Label>
              <Input id={`km-${p.veiculo}`} inputMode="decimal" value={p.porKm} onChange={(e) => mudar(i, "porKm", e.target.value)} />
            </div>
          </div>
        ))}
      </div>
      <Button className="mt-4" onClick={() => void salvar()}>
        <Save className="size-4" /> Salvar valores
      </Button>
    </Card>
  );
}
