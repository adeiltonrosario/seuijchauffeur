import { useEffect, useState } from "react";
import { MapPin, Map as MapIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const BROWSER_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;

/** Região padrão do mapa: Salvador e Região Metropolitana. */
export const REGIAO_PADRAO = "Salvador, BA";

export const ATALHOS_RMS = [
  "Aeroporto Internacional de Salvador (SSA)",
  "Av. Tancredo Neves, Caminho das Árvores, Salvador",
  "Farol da Barra, Salvador",
  "Hospital Geral Roberto Santos, Salvador",
  "Shopping da Bahia, Salvador",
  "Vilas do Atlântico, Lauro de Freitas",
  "Centro, Camaçari",
  "Rodoviária de Salvador",
];

/** Acrescenta a região quando o cliente digita só rua/bairro. */
export function comRegiao(texto: string) {
  const t = texto.trim();
  if (!t) return REGIAO_PADRAO;
  return /\b(BA|Bahia|Salvador|Lauro de Freitas|Camaçari|Simões Filho|Candeias|Feira)\b/i.test(t)
    ? t
    : `${t}, ${REGIAO_PADRAO}`;
}

function urlEmbed(endereco: string) {
  if (!BROWSER_KEY) return null;
  const p = new URLSearchParams({ key: BROWSER_KEY, q: comRegiao(endereco), zoom: "16", language: "pt-BR", region: "BR" });
  return `https://www.google.com/maps/embed/v1/place?${p.toString()}`;
}

type Props = {
  valor: string;
  onConfirmar: (endereco: string) => void;
  rotulo?: string;
};

export function BotaoSelecionarMapa({ valor, onConfirmar, rotulo = "local" }: Props) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(valor);
  const [busca, setBusca] = useState(valor);

  useEffect(() => {
    if (aberto) {
      setTexto(valor);
      setBusca(valor);
    }
  }, [aberto, valor]);

  // Atualiza o mapa 600 ms após parar de digitar.
  useEffect(() => {
    const t = setTimeout(() => setBusca(texto), 600);
    return () => clearTimeout(t);
  }, [texto]);

  const embed = urlEmbed(busca);

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label={`Escolher ${rotulo} no mapa`}
        title="Escolher no mapa"
        onClick={() => setAberto(true)}
      >
        <MapIcon />
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" /> Escolher {rotulo} no mapa
            </DialogTitle>
            <DialogDescription>
              Digite a rua, bairro ou local. O mapa começa em Salvador e Região Metropolitana.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex.: Rua Ceará, Pituba"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {ATALHOS_RMS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setTexto(a)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                {a.split(",")[0]}
              </button>
            ))}
          </div>

          <div className="aspect-[16/10] overflow-hidden rounded-lg border border-border/60 bg-secondary/30">
            {embed ? (
              <iframe
                title="Mapa do endereço"
                src={embed}
                className="size-full"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Mapa indisponível neste ambiente. Confira o endereço digitado e confirme.
              </div>
            )}
          </div>

          <p className="text-sm">
            <span className="text-muted-foreground">Endereço: </span>
            <span className="font-medium">{comRegiao(texto)}</span>
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!texto.trim()}
              onClick={() => {
                onConfirmar(comRegiao(texto));
                setAberto(false);
              }}
            >
              Usar este endereço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
