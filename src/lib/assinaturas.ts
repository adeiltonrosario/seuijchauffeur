/** Módulo de precificação por assinatura e gestão de créditos de viagem. */

export type Periodicidade = "mensal" | "trimestral" | "anual";

export const VIAGENS_POR_MES_PADRAO = 4;
export const PRECO_UNITARIO_AVULSO = 150;
export const VALIDADE_CREDITOS_DIAS = 60;

export const DESCONTOS: Record<Periodicidade, number> = {
  mensal: 0.05,
  trimestral: 0.15,
  anual: 0.3,
};

export const MESES_DO_CICLO: Record<Periodicidade, number> = {
  mensal: 1,
  trimestral: 3,
  anual: 12,
};

export const rotuloPeriodicidade: Record<Periodicidade, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  anual: "Anual",
};

const arredondar = (valor: number) => Math.round(valor * 100) / 100;

export type PlanoCalculado = {
  periodicidade: Periodicidade;
  rotulo: string;
  meses: number;
  viagensPorMes: number;
  creditosTotais: number;
  precoUnitarioAvulso: number;
  precoMensalSemDesconto: number;
  percentualDesconto: number;
  valorMensalEquivalente: number;
  valorTotalCiclo: number;
  valorCicloSemDesconto: number;
  economiaCiclo: number;
  mesesGratisEquivalentes: number;
  exibicaoPrincipal: string;
  exibicaoSecundaria: string;
};

/** Calcula um plano a partir da quantidade de viagens/mês e do preço unitário avulso. */
export const calcularPlano = (
  periodicidade: Periodicidade,
  viagensPorMes: number = VIAGENS_POR_MES_PADRAO,
  precoUnitarioAvulso: number = PRECO_UNITARIO_AVULSO,
  desconto: number = DESCONTOS[periodicidade],
): PlanoCalculado => {
  const meses = MESES_DO_CICLO[periodicidade];
  const precoMensalSemDesconto = arredondar(viagensPorMes * precoUnitarioAvulso);
  const valorCicloSemDesconto = arredondar(precoMensalSemDesconto * meses);
  const valorTotalCiclo = arredondar(valorCicloSemDesconto * (1 - desconto));
  const valorMensalEquivalente = arredondar(valorTotalCiclo / meses);
  const economiaCiclo = arredondar(valorCicloSemDesconto - valorTotalCiclo);
  const mesesGratisEquivalentes = arredondar(economiaCiclo / precoMensalSemDesconto);

  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const exibicaoPrincipal =
    periodicidade === "mensal"
      ? `${brl(valorMensalEquivalente)} /mês`
      : `${meses}x de ${brl(valorMensalEquivalente)} /mês`;

  const exibicaoSecundaria =
    periodicidade === "mensal"
      ? `Economize ${brl(economiaCiclo)} por mês`
      : periodicidade === "trimestral"
        ? `${brl(valorTotalCiclo)} a cada 3 meses`
        : "Economize 3 meses inteiros no ano!";

  return {
    periodicidade,
    rotulo: rotuloPeriodicidade[periodicidade],
    meses,
    viagensPorMes,
    creditosTotais: viagensPorMes * meses,
    precoUnitarioAvulso,
    precoMensalSemDesconto,
    percentualDesconto: desconto,
    valorMensalEquivalente,
    valorTotalCiclo,
    valorCicloSemDesconto,
    economiaCiclo,
    mesesGratisEquivalentes,
    exibicaoPrincipal,
    exibicaoSecundaria,
  };
};

export const calcularTodosOsPlanos = (
  viagensPorMes: number = VIAGENS_POR_MES_PADRAO,
  precoUnitarioAvulso: number = PRECO_UNITARIO_AVULSO,
  descontos: Record<Periodicidade, number> = DESCONTOS,
) =>
  (["mensal", "trimestral", "anual"] as Periodicidade[]).map((p) =>
    calcularPlano(p, viagensPorMes, precoUnitarioAvulso, descontos[p]),
  );

/* ============ Gestão de créditos ============ */

export type LoteCredito = {
  id: string;
  origem: Periodicidade;
  creditosDisponibilizados: number;
  creditosRestantes: number;
  dataDisponibilizacao: string; // AAAA-MM-DD
  dataExpiracao: string; // AAAA-MM-DD (60 dias depois)
};

const CHAVE_CREDITOS = "seuchauffeur-creditos-cliente";

export const chaveData = (d: Date) => d.toISOString().slice(0, 10);

export const somarDias = (data: string, dias: number) => {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return chaveData(d);
};

export const diasAteExpirar = (dataExpiracao: string, hoje: string = chaveData(new Date())) =>
  Math.round(
    (new Date(`${dataExpiracao}T12:00:00`).getTime() - new Date(`${hoje}T12:00:00`).getTime()) /
      86_400_000,
  );

export const loteVigente = (lote: LoteCredito, hoje: string = chaveData(new Date())) =>
  lote.creditosRestantes > 0 && diasAteExpirar(lote.dataExpiracao, hoje) >= 0;

/** Lotes gerados por uma contratação: mensal libera de uma vez; ciclos longos renovam mês a mês. */
export const gerarLotes = (
  plano: PlanoCalculado,
  dataContratacao: string = chaveData(new Date()),
): LoteCredito[] =>
  Array.from({ length: plano.meses }, (_, i) => {
    const disponibilizacao = somarDias(dataContratacao, i * 30);
    return {
      id: `${plano.periodicidade}-${dataContratacao}-${i + 1}`,
      origem: plano.periodicidade,
      creditosDisponibilizados: plano.viagensPorMes,
      creditosRestantes: plano.viagensPorMes,
      dataDisponibilizacao: disponibilizacao,
      dataExpiracao: somarDias(disponibilizacao, VALIDADE_CREDITOS_DIAS),
    };
  });

export const saldoDisponivel = (lotes: LoteCredito[], hoje: string = chaveData(new Date())) =>
  lotes
    .filter((l) => loteVigente(l, hoje) && l.dataDisponibilizacao <= hoje)
    .reduce((total, l) => total + l.creditosRestantes, 0);

/** Créditos vigentes que expiram nos próximos `dias`. */
export const creditosAVencer = (
  lotes: LoteCredito[],
  dias = 30,
  hoje: string = chaveData(new Date()),
) =>
  lotes
    .filter((l) => loteVigente(l, hoje) && diasAteExpirar(l.dataExpiracao, hoje) <= dias)
    .reduce((total, l) => total + l.creditosRestantes, 0);

/** Consome créditos do lote que expira primeiro (FIFO por validade). */
export const consumirCreditos = (
  lotes: LoteCredito[],
  quantidade = 1,
  hoje: string = chaveData(new Date()),
): { lotes: LoteCredito[]; consumidos: number } => {
  let restante = quantidade;
  const ordenados = [...lotes].sort((a, b) => a.dataExpiracao.localeCompare(b.dataExpiracao));
  const atualizados = ordenados.map((lote) => {
    if (restante <= 0 || !loteVigente(lote, hoje) || lote.dataDisponibilizacao > hoje) return lote;
    const usar = Math.min(lote.creditosRestantes, restante);
    restante -= usar;
    return { ...lote, creditosRestantes: lote.creditosRestantes - usar };
  });
  return { lotes: atualizados, consumidos: quantidade - restante };
};

export const carregarCreditos = (): LoteCredito[] => {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE_CREDITOS);
    return bruto ? (JSON.parse(bruto) as LoteCredito[]) : [];
  } catch {
    return [];
  }
};

export const salvarCreditos = (lotes: LoteCredito[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAVE_CREDITOS, JSON.stringify(lotes));
  } catch {
    /* armazenamento indisponível */
  }
};
