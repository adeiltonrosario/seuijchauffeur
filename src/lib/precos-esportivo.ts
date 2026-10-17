import { supabase } from "@/integrations/supabase/client";
import type { Veiculo } from "@/lib/translado-esportivo";

export type PrecoEsportivo = { veiculo: Veiculo; valorEvento: number; porKm: number };

export async function carregarPrecosEsportivo(): Promise<Record<Veiculo, PrecoEsportivo> | null> {
  const { data, error } = await supabase.from("precos_esportivo").select("*");
  if (error || !data?.length) return null;
  const r = {} as Record<Veiculo, PrecoEsportivo>;
  for (const l of data) r[l.veiculo as Veiculo] = { veiculo: l.veiculo as Veiculo, valorEvento: Number(l.valor_evento), porKm: Number(l.por_km) };
  return r;
}

export async function salvarPrecosEsportivo(lista: PrecoEsportivo[]): Promise<boolean> {
  const { error } = await supabase.from("precos_esportivo").upsert(
    lista.map((p) => ({ veiculo: p.veiculo, valor_evento: p.valorEvento, por_km: p.porKm, atualizado_em: new Date().toISOString() })),
  );
  return !error;
}
