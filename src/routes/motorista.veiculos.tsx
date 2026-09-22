import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Car, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CAPACIDADE_PADRAO, veiculos as veiculosIniciais } from "@/lib/dados";

export const Route = createFileRoute("/motorista/veiculos")({
  head: () => ({
    meta: [
      { title: "Meus veículos — seuchauffeur" },
      { name: "description", content: "Cadastre placa, cor, modelo, foto e categoria dos seus veículos." },
      { property: "og:title", content: "Meus veículos — seuchauffeur" },
      { property: "og:description", content: "Gerencie a frota usada nos seus agendamentos." },
    ],
  }),
  component: Veiculos,
});

type Categoria = "Sedan" | "SUV" | "Hatch";

function Veiculos() {
  const [veiculos, setVeiculos] = useState(veiculosIniciais);
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Sedan");
  const [foto, setFoto] = useState<string | null>(null);

  const salvar = () => {
    if (!placa || !modelo || !cor) {
      toast.error("Preencha placa, modelo e cor.");
      return;
    }
    setVeiculos((atual) => [
      ...atual,
      { placa, modelo, cor, categoria, capacidade: CAPACIDADE_PADRAO },
    ]);
    toast.success("Veículo salvo.");
    setPlaca("");
    setModelo("");
    setCor("");
    setFoto(null);
  };

  return (
    <AppShell titulo="Meus veículos" descricao="Cadastre os carros que atenderão suas corridas agendadas.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-luxe border-border/60 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Novo veículo</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="placa">Placa</Label>
              <Input id="placa" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC-1D23" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cor">Cor</Label>
              <Input id="cor" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Preto" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Toyota Corolla" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label>Categoria</Label>
            <div className="flex flex-wrap gap-2">
              {(["Sedan", "SUV", "Hatch"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoria(c)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    categoria === c
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="foto">Foto do veículo</Label>
            <label
              htmlFor="foto"
              className="flex h-32 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground"
            >
              {foto ? (
                <img src={foto} alt="Foto do veículo" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <span className="flex items-center gap-2">
                  <ImagePlus className="size-4" /> Enviar foto
                </span>
              )}
            </label>
            <input
              id="foto"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) setFoto(URL.createObjectURL(arquivo));
              }}
            />
          </div>

          <Button className="mt-5 w-full" onClick={salvar}>
            Salvar veículo
          </Button>
        </Card>

        <Card className="border-border/60 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Veículos cadastrados</h2>
          <ul className="mt-4 space-y-2">
            {veiculos.map((v) => (
              <li key={v.placa}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaca(v.placa);
                    setModelo(v.modelo);
                    setCor(v.cor);
                    setCategoria(v.categoria as Categoria);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3 text-left hover:bg-secondary"
                >
                  <Car className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      {v.modelo} — {v.cor}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {v.placa} · {v.categoria} · {v.capacidade} ocupantes
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
