import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const entradaSchema = z.object({
  origem: z.enum(["cliente", "motorista"]),
  texto: z.string().trim().min(1).max(600),
  cliente: z.string().trim().max(120).default(""),
  motorista: z.string().trim().max(120).default(""),
  veiculo: z.string().trim().max(120).default(""),
  embarque: z.string().trim().max(200).default(""),
  desembarque: z.string().trim().max(200).default(""),
  modalidade: z.string().trim().max(120).default(""),
});

/** Mediação automática: a IA reescreve a mensagem e só a versão oficial é publicada às duas partes. */
export const mediarMensagem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => entradaSchema.parse(input))
  .handler(async ({ data }) => {
    const { mediarTexto, mediacaoHeuristica } = await import("@/lib/mediacao.server");
    try {
      const { mediado, viaIA } = await mediarTexto(data);
      return { ok: true as const, mediado, viaIA };
    } catch (erro) {
      console.error("[mediacao] falha geral", erro);
      return { ok: true as const, mediado: mediacaoHeuristica(data.origem, data.texto), viaIA: false };
    }
  });
