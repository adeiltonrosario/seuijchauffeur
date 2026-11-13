import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChavePix { tipo: string; chave: string; titular: string; banco: string }
export const PIX_VAZIO: ChavePix = { tipo: "CNPJ", chave: "", titular: "", banco: "" };

export async function carregarChavePix(): Promise<ChavePix> {
  const { data } = await supabase.from("config_pix").select("tipo, chave, titular, banco").eq("id", true).maybeSingle();
  return data ?? PIX_VAZIO;
}

export function useChavePix(): ChavePix | null {
  const [pix, setPix] = useState<ChavePix | null>(null);
  useEffect(() => { void carregarChavePix().then(setPix); }, []);
  return pix;
}
