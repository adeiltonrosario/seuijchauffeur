import { useState } from "react";
import { Route as IconeRota, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acharHospital, limparEndereco } from "@/lib/hospitais-rms";

// Rotas 100% gratuitas: Nominatim (OpenStreetMap) para endereços + OSRM para o trajeto viário.
export type ResultadoRota = { km: number; minutos: number };

function comRegiao(e: string) {
  return /salvador|bahia|\bBA\b|lauro|cama[cç]ari|sim[oõ]es|candeias|dias d|itapu/i.test(e) ? e : `${e}, Salvador, BA`;
}

const cache = new Map<string, [number, number]>();
async function geocodificar(endereco: string): Promise<[number, number]> {
  const h = acharHospital(endereco);
  if (h) return [h.lng, h.lat];
  const q = limparEndereco(comRegiao(limparEndereco(endereco)));
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

/** Rota tolerante: ignora pontos não localizados e informa quais falharam (índices). */
export async function calcularRotaTolerante(pontos: string[]): Promise<{ rota: RotaCompleta | null; falhas: number[]; indices: number[] }> {
  const coords: [number, number][] = [];
  const falhas: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < pontos.length; i++) {
    try { coords.push(await geocodificar(pontos[i]!)); indices.push(i); } catch { falhas.push(i); }
  }
  if (coords.length < 2) return { rota: null, falhas, indices };
  const caminho = coords.map((c) => c.join(",")).join(";");
  const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${caminho}?overview=full&geometries=geojson`);
  const d = (await r.json()) as { code: string; routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
  const rota = d.routes?.[0];
  if (d.code !== "Ok" || !rota) throw new Error("Rota indisponível");
  return {
    falhas, indices,
    rota: {
      km: Math.round(rota.distance / 10) / 100,
      minutos: Math.round(rota.duration / 60),
      pontos: coords.map(([lng, lat]) => [lat, lng]),
      linha: rota.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    },
  };
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

export type RotaCompleta = ResultadoRota & { pontos: [number, number][]; linha: [number, number][] };

/** Igual a calcularRota, mas devolve também coordenadas (lat,lng) dos pontos e o traçado viário. */
export async function calcularRotaCompleta(pontos: string[]): Promise<RotaCompleta> {
  const lista = pontos.map((p) => p.trim()).filter(Boolean);
  if (lista.length < 2) throw new Error("Informe ao menos origem e destino.");
  const coords: [number, number][] = [];
  for (const p of lista) coords.push(await geocodificar(p));
  const caminho = coords.map((c) => c.join(",")).join(";");
  const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${caminho}?overview=full&geometries=geojson`);
  const d = (await r.json()) as { code: string; routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
  const rota = d.routes?.[0];
  if (d.code !== "Ok" || !rota) throw new Error("Rota indisponível");
  return {
    km: Math.round(rota.distance / 10) / 100,
    minutos: Math.round(rota.duration / 60),
    pontos: coords.map(([lng, lat]) => [lat, lng]),
    linha: rota.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
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
