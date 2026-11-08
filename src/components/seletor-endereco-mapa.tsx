import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Map as MapIcon, Search } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
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
import { localizarEndereco } from "@/lib/geocodificar";

const MapaPino = lazy(() => import("@/components/mapa-pino"));

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

type EnderecoOSM = {
  road?: string; pedestrian?: string; house_number?: string; suburb?: string; neighbourhood?: string;
  city?: string; town?: string; village?: string; municipality?: string; state?: string;
};

/** Monta "Rua, nº - Bairro, Cidade - BA" a partir do retorno do Nominatim. */
function formatarEndereco(a: EnderecoOSM, reserva: string) {
  const rua = a.road ?? a.pedestrian;
  const bairro = a.suburb ?? a.neighbourhood;
  const cidade = a.city ?? a.town ?? a.village ?? a.municipality;
  const partes = [rua ? (a.house_number ? `${rua}, ${a.house_number}` : rua) : null, bairro, cidade].filter(Boolean);
  return partes.length ? `${partes.join(", ")}, BA` : reserva;
}

async function enderecoDoPonto(lat: number, lng: number) {
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`, {
    headers: { "Accept-Language": "pt-BR" },
  });
  const d = (await r.json()) as { display_name?: string; address?: EnderecoOSM };
  return formatarEndereco(d.address ?? {}, d.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
}

async function pontoDoEndereco(texto: string): Promise<[number, number] | null> {
  return localizarEndereco(comRegiao(texto));
}

type Props = {
  valor: string;
  onConfirmar: (endereco: string) => void;
  rotulo?: string;
};

export function BotaoSelecionarMapa({ valor, onConfirmar, rotulo = "local" }: Props) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(valor);
  const [posicao, setPosicao] = useState<[number, number] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const doPino = useRef(false); // texto veio do pino: não refazer busca

  useEffect(() => {
    if (aberto) { setTexto(valor); setPosicao(null); }
  }, [aberto, valor]);

  // Digitou: move o pino até o endereço (600 ms após parar de digitar).
  useEffect(() => {
    if (!aberto || !texto.trim()) return;
    if (doPino.current) { doPino.current = false; return; }
    const t = setTimeout(() => {
      void pontoDoEndereco(texto).then((p) => p && setPosicao(p)).catch(() => undefined);
    }, 600);
    return () => clearTimeout(t);
  }, [texto, aberto]);

  // Marcou no mapa: descobre e salva o endereço do ponto.
  const aoMarcar = async (lat: number, lng: number) => {
    setPosicao([lat, lng]);
    setBuscando(true);
    try {
      const end = await enderecoDoPonto(lat, lng);
      doPino.current = true;
      setTexto(end);
      onConfirmar(end);
    } catch {
      // mantém o texto atual
    } finally {
      setBuscando(false);
    }
  };

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
              Toque no mapa ou arraste o pino até o local. O endereço é salvo automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
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
            <ClientOnly fallback={null}>
              <Suspense fallback={<div className="flex size-full items-center justify-center"><Loader2 className="animate-spin" /></div>}>
                <MapaPino posicao={posicao} onMarcar={(la, ln) => void aoMarcar(la, ln)} />
              </Suspense>
            </ClientOnly>
          </div>

          <p className="flex items-center gap-2 text-sm">
            {buscando && <Loader2 className="size-4 animate-spin" />}
            <span className="text-muted-foreground">Endereço: </span>
            <span className="font-medium">{comRegiao(texto)}</span>
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!texto.trim() || buscando}
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
