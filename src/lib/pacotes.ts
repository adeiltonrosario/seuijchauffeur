// Pacotes de créditos: o pacote é a forma de pagamento (ciclo); o saldo liberado é em reais
// (1 crédito = R$ 1,00) e cada corrida debita o valor da modalidade escolhida.
export type Ciclo = "diario" | "semanal" | "quinzenal" | "mensal";
export const CICLOS: Ciclo[] = ["diario", "semanal", "quinzenal", "mensal"];
export const rotuloCiclo: Record<Ciclo, string> = { diario: "Diário", semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal" };
export const validadeCiclo: Record<Ciclo, string> = { diario: "24 horas", semanal: "7 dias", quinzenal: "15 dias", mensal: "30 dias" };
const DIAS: Record<Ciclo, number> = { diario: 1, semanal: 7, quinzenal: 15, mensal: 30 };
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Valor do pacote personalizado por km (legado; o servidor refaz este cálculo). */
export function valorPersonalizado(km: number, precoKm: number) {
  return r2(Math.round(km) * precoKm);
}

/** Percentual de bônus do pacote: (saldo liberado − valor pago) / valor pago. */
export function bonusPercentual(valorPago: number, saldo: number) {
  if (valorPago <= 0 || saldo <= valorPago) return 0;
  return Math.round(((saldo - valorPago) / valorPago) * 100);
}

/** Débito de uma corrida no saldo: usa o saldo e cobra a diferença no Pix. */
export function debitarCorrida(valorCorrida: number, saldo: number) {
  const valor = r2(Math.max(0, valorCorrida));
  const usado = r2(Math.min(valor, Math.max(0, saldo)));
  return { usado, pagarPix: r2(valor - usado), saldoApos: r2(Math.max(0, saldo) - usado) };
}

/** Data aproximada de vencimento dos créditos a partir da compra aprovada. */
export function vencimento(ciclo: Ciclo, base: Date) {
  const d = new Date(base);
  if (ciclo === "mensal") d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + DIAS[ciclo]);
  return d;
}
