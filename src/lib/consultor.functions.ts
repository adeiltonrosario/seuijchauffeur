import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const entradaSchema = z.object({
  origem: z.string().trim().min(2).max(200),
  destino: z.string().trim().min(2).max(200),
  frequencia: z.string().trim().min(1).max(80),
  necessidades: z.string().trim().max(800).default(""),
});

/** Consulta gratuita: recomenda modalidade e plano, sem consumir créditos de viagem do cliente. */
export const consultarRecomendacao = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => entradaSchema.parse(input))
  .handler(async ({ data }) => {
    const { recomendar, planoRecomendado } = await import("@/lib/consultor.server");
    try {
      const recomendacao = await recomendar(data);
      const plano = planoRecomendado(
        recomendacao.modalidade,
        recomendacao.periodicidade,
        recomendacao.viagensPorMes,
      );
      return { ok: true as const, recomendacao, plano };
    } catch (erro) {
      console.error("[consultor] falha ao recomendar", erro);
      const mensagem =
        erro instanceof Error && erro.message.includes("indisponível")
          ? erro.message
          : "Não conseguimos gerar a recomendação agora. Tente novamente em instantes.";
      return { ok: false as const, erro: mensagem };
    }
  });
