// Regras do Translado Esportivo — Clube de Futebol.
// Valores de referência (evento por veículo) são provisórios e editáveis futuramente no Admin.

export type Veiculo = "carro" | "minivan" | "van";
export type Cobranca = "evento" | "km" | "franquia";

export const VEICULOS: Record<Veiculo, { nome: string; min: number; max: number; bagagens: number; valorEvento: number }> = {
  carro: { nome: "Carro executivo", min: 1, max: 4, bagagens: 3, valorEvento: 250 },
  minivan: { nome: "Minivan executiva", min: 5, max: 7, bagagens: 6, valorEvento: 400 },
  van: { nome: "Van executiva", min: 10, max: 15, bagagens: 15, valorEvento: 650 },
};

export const TARIFA_KM = 3.0;
export const TARIFA_KM_MINIMA = 1.85;

const centavos = (v: number) => Math.round(v * 100) / 100;

/** Menor veículo que comporta os passageiros; acima de 15 divide em várias vans. */
export function recomendarVeiculos(passageiros: number, bagagens = 0): { veiculo: Veiculo; quantidade: number } {
  if (passageiros <= 4 && bagagens <= VEICULOS.carro.bagagens) return { veiculo: "carro", quantidade: 1 };
  if (passageiros <= 7 && bagagens <= VEICULOS.minivan.bagagens) return { veiculo: "minivan", quantidade: 1 };
  const porPessoas = Math.ceil(passageiros / VEICULOS.van.max);
  const porBagagem = Math.ceil(bagagens / VEICULOS.van.bagagens);
  return { veiculo: "van", quantidade: Math.max(1, porPessoas, porBagagem) };
}

export type Calculo = { linhas: { texto: string; valor: number }[]; total: number; kmConsumidos: number; kmExcedente: number };

export function calcularEsportivo(p: {
  cobranca: Cobranca; veiculo: Veiculo; quantidade: number; km: number; saldoFranquiaKm?: number;
}): Calculo {
  const km = Math.max(0, p.km);
  const q = Math.max(1, p.quantidade);
  const nome = VEICULOS[p.veiculo].nome;
  if (p.cobranca === "evento") {
    const v = centavos(VEICULOS[p.veiculo].valorEvento * q);
    return { linhas: [{ texto: `Valor fechado por evento — ${q}× ${nome}`, valor: v }], total: v, kmConsumidos: 0, kmExcedente: 0 };
  }
  if (p.cobranca === "km") {
    const v = centavos(km * TARIFA_KM * q);
    return { linhas: [{ texto: `${km.toFixed(1)} km × R$ ${TARIFA_KM.toFixed(2)} × ${q} veículo(s)`, valor: v }], total: v, kmConsumidos: 0, kmExcedente: 0 };
  }
  const necessario = km * q;
  const saldo = Math.max(0, p.saldoFranquiaKm ?? 0);
  const consumidos = Math.min(saldo, necessario);
  const excedente = centavos(necessario - consumidos);
  const v = centavos(excedente * TARIFA_KM);
  return {
    linhas: [
      { texto: `Franquia mensal: ${consumidos.toFixed(1)} km debitados`, valor: 0 },
      { texto: `Excedente: ${excedente.toFixed(1)} km × R$ ${TARIFA_KM.toFixed(2)}`, valor: v },
    ],
    total: v, kmConsumidos: centavos(consumidos), kmExcedente: excedente,
  };
}
