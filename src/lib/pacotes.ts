// Pacotes de créditos: 1 km = 1 crédito; os créditos vencem no fim do ciclo contratado.
export type Ciclo = "diario" | "semanal" | "quinzenal" | "mensal";
export const CICLOS: Ciclo[] = ["diario", "semanal", "quinzenal", "mensal"];
export const rotuloCiclo: Record<Ciclo, string> = { diario: "Diário", semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal" };
export const validadeCiclo: Record<Ciclo, string> = { diario: "24 horas", semanal: "7 dias", quinzenal: "15 dias", mensal: "30 dias" };
const DIAS: Record<Ciclo, number> = { diario: 1, semanal: 7, quinzenal: 15, mensal: 30 };

/** Valor do pacote personalizado (o servidor refaz este cálculo). */
export function valorPersonalizado(km: number, precoKm: number) {
  return Math.round(Math.round(km) * precoKm * 100) / 100;
}

/** Data aproximada de vencimento dos créditos a partir da compra aprovada. */
export function vencimento(ciclo: Ciclo, base: Date) {
  const d = new Date(base);
  if (ciclo === "mensal") d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + DIAS[ciclo]);
  return d;
}
