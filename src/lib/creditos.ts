// Regras de créditos (espelho das funções do banco, usadas para simulação na tela).
export const CREDITOS_POR_KM = 2;
export const TAXA_COFRE = 1;
export const VALIDADE_COFRE_MESES = 2;

export type Lote = { id: string; local: "carteira" | "cofre"; saldo: number; vence_em: string; concedido_em: string; status: string };

/** Créditos de uma viagem: deslocamento até o embarque + percurso com passageiro. */
export function creditosViagem(kmAteEmbarque: number, kmViagem: number, porKm = CREDITOS_POR_KM) {
  return Math.ceil((Math.max(0, kmAteEmbarque) + Math.max(0, kmViagem)) * porKm);
}

/** Simula a transferência ao Cofre: retorna quanto entra no Cofre ou null se inválida. */
export function simularCofre(quantidade: number, disponivel: number, taxa = TAXA_COFRE) {
  if (!(quantidade > taxa) || quantidade > disponivel) return null;
  return { carteira: disponivel - quantidade, cofre: quantidade - taxa, taxa };
}

/** Vencimento do Cofre: dois meses a partir do momento exato do envio. */
export function vencimentoCofre(agora: Date, meses = VALIDADE_COFRE_MESES) {
  const d = new Date(agora);
  d.setMonth(d.getMonth() + meses);
  return d;
}

/** Ordem de consumo: carteira antes do cofre; vencimento mais próximo; empate → mais antigo. */
export function ordemConsumo(lotes: Lote[], agora = new Date()) {
  return lotes
    .filter((l) => l.status === "ativo" && l.saldo > 0 && new Date(l.vence_em) > agora)
    .sort((a, b) =>
      a.local !== b.local ? (a.local === "carteira" ? -1 : 1)
      : +new Date(a.vence_em) - +new Date(b.vence_em) || +new Date(a.concedido_em) - +new Date(b.concedido_em));
}
