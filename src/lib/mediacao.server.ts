import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODELO = "openai/gpt-6-astra";

export type ContextoMediacao = {
  origem: "cliente" | "motorista";
  texto: string;
  cliente: string;
  motorista: string;
  veiculo: string;
  embarque: string;
  desembarque: string;
  modalidade: string;
};

const DIRETRIZES = `Você é a Mediação SeuChauffeur, camada de comunicação oficial entre passageiro e motorista de um serviço brasileiro de transporte executivo agendado.

Nenhuma das partes tem contato direto: toda mensagem passa por você e só a sua versão é publicada para ambos.

Regras obrigatórias:
- Reescreva a mensagem em português do Brasil, tom executivo, cordial e objetivo, em terceira pessoa ("O passageiro informou...", "O motorista comunicou...").
- Preserve os dados operacionais: tempos, distâncias, número de bagagens, portaria, ponto de encontro, andar, placa.
- Remova gírias, xingamentos, agressividade e cobranças pessoais.
- Nunca repasse telefone, e-mail, redes sociais, chave Pix ou qualquer combinação de pagamento fora da custódia da plataforma. Nesse caso, informe de forma neutra que a combinação não é permitida e que o pagamento permanece na custódia.
- Uma única mensagem, no máximo duas frases, sem saudações longas, sem emojis e sem aspas.
- Responda apenas com o texto final publicado, nada mais.`;

/** Fallback determinístico: garante que a comunicação nunca trave. */
export function mediacaoHeuristica(origem: "cliente" | "motorista", texto: string) {
  const limpo = texto.trim().replace(/\s+/g, " ");
  const sensivel =
    /(\+?\d[\d\s().-]{7,})|(\b\d{2}\s?9?\d{4}[-\s]?\d{4}\b)|@|whats|pix|dinheiro|por fora|fora do app/i.test(limpo);
  if (sensivel) {
    return origem === "cliente"
      ? "O passageiro enviou um comunicado com dados de contato ou pagamento externo. Por segurança, a informação não foi repassada: toda comunicação e o pagamento seguem pela plataforma, em custódia."
      : "O motorista enviou um comunicado com dados de contato ou pagamento externo. Por segurança, a informação não foi repassada: toda comunicação e o pagamento seguem pela plataforma, em custódia.";
  }
  const conteudo = limpo.replace(/[.!?]+$/, "");
  return origem === "cliente"
    ? `O passageiro informou: ${conteudo}.`
    : `O motorista informou: ${conteudo}.`;
}

export async function mediarTexto(ctx: ContextoMediacao): Promise<{ mediado: string; viaIA: boolean }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { mediado: mediacaoHeuristica(ctx.origem, ctx.texto), viaIA: false };

  try {
    const provider = createOpenAI({
      baseURL: GATEWAY_URL,
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const result = streamText({
      model: provider.responses(MODELO),
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
      system: DIRETRIZES,
      prompt: `Contexto da corrida:
- Passageiro: ${ctx.cliente}
- Motorista: ${ctx.motorista}
- Veículo: ${ctx.veiculo}
- Embarque: ${ctx.embarque}
- Desembarque: ${ctx.desembarque}
- Modalidade: ${ctx.modalidade}

Mensagem enviada pelo ${ctx.origem === "cliente" ? "passageiro" : "motorista"}:
"""${ctx.texto}"""

Publique a mensagem oficial da mediação.`,
    });

    let texto = "";
    for await (const parte of result.textStream) texto += parte;
    const limpo = texto.trim().replace(/^["“]|["”]$/g, "").trim();
    if (!limpo) return { mediado: mediacaoHeuristica(ctx.origem, ctx.texto), viaIA: false };
    return { mediado: limpo, viaIA: true };
  } catch (erro) {
    console.error("[mediacao] falha na IA, aplicando fallback", erro);
    return { mediado: mediacaoHeuristica(ctx.origem, ctx.texto), viaIA: false };
  }
}
