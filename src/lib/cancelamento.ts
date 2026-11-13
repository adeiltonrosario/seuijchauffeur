export const TAXA_CANCELAMENTO_PCT = 30;
export function taxaCancelamento(valor: number): number {
  return Math.round(valor * TAXA_CANCELAMENTO_PCT) / 100;
}
