import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import {
  DESCONTOS,
  MESES_DO_CICLO,
  VALIDADE_CREDITOS_DIAS,
  calcularPlano,
  rotuloPeriodicidade,
  type Periodicidade,
} from "@/lib/assinaturas";
import { VALOR_MINIMO_POR_KM, formatarBRL, modalidades } from "@/lib/dados";

const TAXA_SERVICO = 8;
import { DIARIA_ESTACIONAMENTO, ZONAS } from "@/lib/precificacao-zonas";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODELO = "openai/gpt-6-astra";

export type EntradaConsultor = {
  origem: string;
  destino: string;
  frequencia: string;
  necessidades: string;
};

export type Recomendacao = {
  modalidade: string;
  motivoModalidade: string;
  periodicidade: Periodicidade;
  motivoPlano: string;
  viagensPorMes: number;
  dicas: string[];
  resumo: string;
};

const catalogo = () => {
  const linhasModalidades = modalidades
    .map(
      (m) =>
        `- ${m.nome}: ${formatarBRL(m.valorPorKm)}/km, referência avulsa ${formatarBRL(m.precoAvulso)} por viagem. Procedimentos: ${m.caracteristicas}`,
    )
    .join("\n");

  const linhasPlanos = (Object.keys(MESES_DO_CICLO) as Periodicidade[])
    .map((p) => `- ${rotuloPeriodicidade[p]}: ${Math.round(DESCONTOS[p] * 100)}% de desconto, ciclo de ${MESES_DO_CICLO[p]} mês(es)`)
    .join("\n");

  const linhasZonas = ZONAS.map((z) => `- ${z.nome}: ${formatarBRL(z.valor)} por trecho (${z.bairros.slice(0, 4).join(", ")})`).join("\n");

  return `MODALIDADES DISPONÍVEIS:\n${linhasModalidades}\n\nPLANOS DE ASSINATURA:\n${linhasPlanos}\nCréditos de viagem valem ${VALIDADE_CREDITOS_DIAS} dias e são consumidos do mais antigo para o mais novo.\n\nZONAS DE TRANSFER (preço fixo por trecho):\n${linhasZonas}\nEstacionamento de aeroporto custa ${formatarBRL(DIARIA_ESTACIONAMENTO)} por dia.\n\nREGRAS DE TARIFA:\n- Tarifa padrão R$ 2,20/km, piso mínimo ${formatarBRL(VALOR_MINIMO_POR_KM)}/km.\n- Taxa de serviço fixa de ${formatarBRL(TAXA_SERVICO)} por reserva.\n- Ida e volta recebe 15% de desconto de pacote.\n- Paradas intermediárias: 3 minutos de cortesia e R$ 0,50 por minuto adicional.\n- Trechos entre 23h e 05h recebem adicional noturno de 15%.`;
};

export async function recomendar(entrada: EntradaConsultor): Promise<Recomendacao> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Consultor indisponível no momento.");

  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  const nomes = modalidades.map((m) => m.nome);

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
    system: `Você é o consultor de mobilidade do seuchauffeur, serviço brasileiro de transporte executivo agendado. Responda sempre em português do Brasil.\n\n${catalogo()}\n\nAnalise o relato do cliente e recomende exatamente uma modalidade da lista e uma periodicidade de plano (mensal, trimestral ou anual). Estime quantas viagens por mês o cliente fará a partir da frequência informada (use um dos valores 2, 4, 8 ou 12). Seja concreto: cite valores em reais e cite os procedimentos de embarque relevantes ao caso.\n\nResponda SOMENTE com um objeto JSON válido, sem cercas de código, no formato:\n{"modalidade":"<um de: ${nomes.join(" | ")}>","motivoModalidade":"<2 frases>","periodicidade":"mensal|trimestral|anual","motivoPlano":"<2 frases com valores em reais>","viagensPorMes":2|4|8|12,"dicas":["<dica curta>","<dica curta>","<dica curta>"],"resumo":"<1 frase de fechamento>"}`,
    prompt: `Origem: ${entrada.origem}\nDestino: ${entrada.destino}\nFrequência informada: ${entrada.frequencia}\nNecessidades e contexto: ${entrada.necessidades || "não informado"}`,
  });

  console.log("[consultor] stream iniciado");
  let texto = "";
  for await (const parte of result.textStream) texto += parte;
  console.log("[consultor] stream concluído", texto.length);
  const bruto = texto.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const inicio = bruto.indexOf("{");
  const fim = bruto.lastIndexOf("}");
  if (inicio === -1 || fim === -1) throw new Error("Não foi possível interpretar a recomendação.");

  const dados = JSON.parse(bruto.slice(inicio, fim + 1)) as Partial<Recomendacao>;

  const modalidade = nomes.includes(dados.modalidade ?? "") ? dados.modalidade! : nomes[0]!;
  const periodicidade: Periodicidade = (["mensal", "trimestral", "anual"] as Periodicidade[]).includes(
    dados.periodicidade as Periodicidade,
  )
    ? (dados.periodicidade as Periodicidade)
    : "trimestral";
  const viagensPorMes = [2, 4, 8, 12].includes(Number(dados.viagensPorMes)) ? Number(dados.viagensPorMes) : 4;

  return {
    modalidade,
    motivoModalidade: dados.motivoModalidade ?? "",
    periodicidade,
    motivoPlano: dados.motivoPlano ?? "",
    viagensPorMes,
    dicas: Array.isArray(dados.dicas) ? dados.dicas.slice(0, 4).map(String) : [],
    resumo: dados.resumo ?? "",
  };
}

/** Cálculo local do plano recomendado, para exibir a economia sem depender da IA. */
export function planoRecomendado(modalidade: string, periodicidade: Periodicidade, viagensPorMes: number) {
  const precoAvulso = modalidades.find((m) => m.nome === modalidade)?.precoAvulso ?? 150;
  return calcularPlano(periodicidade, viagensPorMes, precoAvulso, DESCONTOS[periodicidade]);
}
