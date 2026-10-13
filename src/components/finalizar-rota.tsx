import { useState } from "react";
import { Route as IconeRota, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Rotas 100% gratuitas: Nominatim (OpenStreetMap) para endereços + OSRM para o trajeto viário.
export type ResultadoRota = { km: number; minutos: number };

function comRegiao(e: string) {
  return /salvador|bahia|\bBA\b|lauro|cama[cç]ari|sim[oõ]es|candeias|dias d|itapu/i.test(e) ? e : `${e}, Salvador, BA`;
}

const cache = new Map<string, [number, number]>();
async function geocodificar(endereco: string): Promise<[number, number]> {
  const q = comRegiao(endereco);
  const salvo = cache.get(q);
  if (salvo) return salvo;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&viewbox=-38.75,-12.40,-37.90,-13.05&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
  const d = (await r.json()) as { lat: string; lon: string }[];
  if (!d[0]) throw new Error(`Endereço não encontrado: ${endereco}`);
  const p: [number, number] = [Number(d[0].lon), Number(d[0].lat)];
  cache.set(q, p);
  return p;
}

/** Calcula a rota consolidada Origem → Paradas → Destino (km e minutos). */
export async function calcularRota(pontos: string[]): Promise<ResultadoRota> {
  const lista = pontos.map((p) => p.trim()).filter(Boolean);
  if (lista.length < 2) throw new Error("Informe ao menos origem e destino.");
  const coords: [number, number][] = [];
  for (const p of lista) coords.push(await geocodificar(p)); // sequencial: respeita limite do Nominatim
  const caminho = coords.map((c) => c.join(",")).join(";");
  const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${caminho}?overview=false`);
  const d = (await r.json()) as { code: string; routes?: { distance: number; duration: number }[] };
  const rota = d.routes?.[0];
  if (d.code !== "Ok" || !rota) throw new Error("Rota indisponível");
  return { km: Math.round(rota.distance / 10) / 100, minutos: Math.round(rota.duration / 60) };
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
