import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entradaSchema = z.object({
  corridaId: z.string().trim().min(1).max(60),
  texto: z.string().trim().min(1).max(600),
});

/**
 * Mediação automática: a IA reescreve a mensagem e só a versão oficial é gravada
 * e publicada às duas partes. O texto original nunca é armazenado nem repassado.
 */
export const mediarMensagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => entradaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: papel } = await context.supabase.rpc("papel_na_corrida", { _corrida: data.corridaId });
    if (papel !== "cliente" && papel !== "motorista") {
      throw new Error("Você não participa desta corrida.");
    }
    const { data: c } = await context.supabase
      .from("corridas")
      .select("cliente, motorista, veiculo, embarque, desembarque, modalidade")
      .eq("id", data.corridaId)
      .maybeSingle();

    const { mediarTexto, mediacaoHeuristica } = await import("@/lib/mediacao.server");
    const ctx = {
      origem: papel,
      texto: data.texto,
      cliente: c?.cliente ?? "",
      motorista: c?.motorista ?? "",
      veiculo: c?.veiculo ?? "",
      embarque: c?.embarque ?? "",
      desembarque: c?.desembarque ?? "",
      modalidade: c?.modalidade ?? "",
    } as const;
    let mediado: string;
    try {
      mediado = (await mediarTexto(ctx)).mediado;
    } catch (erro) {
      console.error("[mediacao] falha geral", erro);
      mediado = mediacaoHeuristica(papel, data.texto);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("mensagens_corrida")
      .insert({ corrida_id: data.corridaId, origem: papel, texto_mediado: mediado });
    if (error) {
      console.error("[mediacao] gravar:", error.message);
      throw new Error("Não foi possível gravar a mensagem.");
    }
    return { ok: true as const, mediado };
  });
