import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Catalogo = Record<string, string[]>;
let cache: Catalogo | null = null;

/** Seleção de marca e modelo a partir do catálogo pré-cadastrado (com busca). Retorna "Marca Modelo". */
export function MarcaModelo({ id, onChange }: { id: string; onChange: (valor: string) => void }) {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(cache);
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");

  useEffect(() => {
    if (cache) return;
    void import("@/data/catalogo-veiculos.json").then((m) => {
      cache = m.default as Catalogo;
      setCatalogo(cache);
    });
  }, []);

  const marcas = useMemo(() => (catalogo ? Object.keys(catalogo) : []), [catalogo]);
  const modelos = catalogo?.[marca] ?? [];

  useEffect(() => {
    onChange(marca.trim() && modelo.trim() ? `${marca.trim()} ${modelo.trim()}` : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca, modelo]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${id}-marca`}>Marca *</Label>
        <Input
          id={`${id}-marca`}
          list={`${id}-marcas`}
          value={marca}
          onChange={(e) => { setMarca(e.target.value); setModelo(""); }}
          placeholder={catalogo ? "Digite ou escolha a marca" : "Carregando marcas..."}
        />
        <datalist id={`${id}-marcas`}>{marcas.map((m) => <option key={m} value={m} />)}</datalist>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-modelo`}>Modelo *</Label>
        <Input
          id={`${id}-modelo`}
          list={`${id}-modelos`}
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
          disabled={!marca}
          placeholder={marca ? "Digite ou escolha o modelo" : "Escolha a marca primeiro"}
        />
        <datalist id={`${id}-modelos`}>{modelos.map((m) => <option key={m} value={m} />)}</datalist>
      </div>
    </div>
  );
}
