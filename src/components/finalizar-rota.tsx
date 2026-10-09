import { useState } from "react";
import { Route as IconeRota, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const BROWSER_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;

export type ResultadoRota = { km: number; minutos: number };

function comRegiao(e: string) {
  return /salvador|bahia|\bBA\b|lauro|cama[cç]ari|sim[oõ]es|candeias/i.test(e) ? e : `${e}, Salvador, BA`;
}

type GoogleMaps = {
  maps: {
    DirectionsService: new () => {
      route: (req: unknown) => Promise<{
        routes: { legs: { distance?: { value: number }; duration?: { value: number } }[] }[];
      }>;
    };
  };
};

let carregando: Promise<GoogleMaps> | null = null;
function carregarMaps(): Promise<GoogleMaps> {
  const w = window as unknown as { google?: GoogleMaps };
  if (w.google?.maps?.DirectionsService) return Promise.resolve(w.google);
  if (!carregando) {
    carregando = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&language=pt-BR&region=BR`;
      s.async = true;
      s.onload = () => (w.google ? resolve(w.google) : reject(new Error("Mapa indisponível")));
      s.onerror = () => {
        carregando = null;
        reject(new Error("Mapa indisponível"));
      };
      document.head.appendChild(s);
    });
  }
  return carregando;
}

/** Calcula a rota consolidada Origem → Paradas → Destino (km e minutos). */
export async function calcularRota(pontos: string[]): Promise<ResultadoRota> {
  const lista = pontos.map((p) => p.trim()).filter(Boolean);
  if (lista.length < 2) throw new Error("Informe ao menos origem e destino.");
  if (!BROWSER_KEY) throw new Error("Mapa não configurado.");
  const g = await carregarMaps();
  const res = await new g.maps.DirectionsService().route({
    origin: comRegiao(lista[0]!),
    destination: comRegiao(lista[lista.length - 1]!),
    waypoints: lista.slice(1, -1).map((p) => ({ location: comRegiao(p), stopover: true })),
    travelMode: "DRIVING",
    region: "BR",
  });
  const legs = res.routes[0]?.legs ?? [];
  const metros = legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0);
  const seg = legs.reduce((s, l) => s + (l.duration?.value ?? 0), 0);
  return { km: Math.round(metros / 10) / 100, minutos: Math.round(seg / 60) };
}

export function BotaoFinalizarRota({
  pontos,
  onCalculado,
  rotulo = "Finalizar trajeto e calcular tarifa",
}: {
  pontos: string[];
  onCalculado: (r: ResultadoRota) => void;
  rotulo?: string;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  async function executar() {
    setOcupado(true);
    setMsg(null);
    try {
      const r = await calcularRota(pontos);
      onCalculado(r);
      setErro(false);
      setMsg(`Rota completa: ${r.km.toLocaleString("pt-BR")} km · cerca de ${r.minutos} min.`);
    } catch (e) {
      setErro(true);
      setMsg(
        e instanceof Error && e.message.startsWith("Informe")
          ? e.message
          : "Não foi possível calcular a rota. Confira os endereços ou informe os km manualmente.",
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={executar} disabled={ocupado} className="w-full">
        {ocupado ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <IconeRota className="mr-2 h-4 w-4" />}
        {rotulo}
      </Button>
      {msg && <p className={`text-xs ${erro ? "text-destructive" : "text-primary"}`}>{msg}</p>}
    </div>
  );
}
