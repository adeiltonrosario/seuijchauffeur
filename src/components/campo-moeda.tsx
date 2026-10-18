import { useEffect, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { lerMoeda, mostrarMoeda } from "@/lib/moeda";

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  valor: number;
  aoMudar: (valor: number) => void;
};

/** Campo de valor em reais: aceita vírgula e centavos, e mostra sempre 0,00 ao sair do campo. */
export function CampoMoeda({ valor, aoMudar, onBlur, ...resto }: Props) {
  const [texto, setTexto] = useState(mostrarMoeda(valor));
  const [focado, setFocado] = useState(false);
  useEffect(() => {
    if (!focado) setTexto(mostrarMoeda(valor));
  }, [valor, focado]);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        {...resto}
        className={`pl-9 ${resto.className ?? ""}`}
        inputMode="decimal"
        value={texto}
        onFocus={() => setFocado(true)}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, "");
          setTexto(t);
          aoMudar(lerMoeda(t));
        }}
        onBlur={(e) => {
          setFocado(false);
          setTexto(mostrarMoeda(lerMoeda(texto)));
          onBlur?.(e);
        }}
      />
    </div>
  );
}
