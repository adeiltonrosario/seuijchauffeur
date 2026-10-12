// Cálculo da cobertura de uma corrida pela carteira de km (sem expiração).
export const TARIFA_EXCEDENTE_KM = 3;
export const TAXA_SERVICO = 8;

export type Cobertura = { coberto: number; excedente: number; valorExcedente: number; total: number; saldoApos: number };

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcularCobertura(distanciaKm: number, saldoKm: number, tarifa = TARIFA_EXCEDENTE_KM, taxa = TAXA_SERVICO): Cobertura {
  const dist = r1(Math.max(0, distanciaKm));
  const saldo = r1(Math.max(0, saldoKm));
  const coberto = Math.min(dist, saldo);
  const excedente = r1(dist - coberto);
  const valorExcedente = r2(excedente * tarifa);
  return { coberto, excedente, valorExcedente, total: excedente > 0 ? r2(valorExcedente + taxa) : 0, saldoApos: r1(saldo - coberto) };
}

export function emailCliente(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("seuchauffeur:cliente-email") ?? "";
}
