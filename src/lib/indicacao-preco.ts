/** Cálculo puro do valor da assinatura com descontos do programa de indicação. */
export function valorComIndicacao(params: {
  valorTotalCiclo: number;
  valorMensal: number;
  descontoTitularPct: number; // 0–20
  usaCodigoAmigo: boolean; // 10% na 1ª mensalidade
}) {
  const fator = 1 - Math.min(Math.max(params.descontoTitularPct, 0), 20) / 100;
  const total = params.valorTotalCiclo * fator;
  const primeiraMensalidade = params.valorMensal * fator;
  const descontoAmigo = params.usaCodigoAmigo ? primeiraMensalidade * 0.1 : 0;
  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    descontoTitular: r(params.valorTotalCiclo - total),
    descontoAmigo: r(descontoAmigo),
    total: r(total - descontoAmigo),
  };
}
