// Regras do Saldão de créditos bônus (espelho das funções do banco, para mostrar na tela).
export const MINUTOS_RESERVA = 30;

/** Valor da compra em reais, arredondado em centavos. */
export function valorCompra(quantidade: number, precoUnitario: number) {
  return Math.round(quantidade * precoUnitario * 100) / 100;
}

/** Mensagem de erro da quantidade escolhida, ou null se pode reservar. */
export function erroQuantidade(quantidade: number, disponivel: number): string | null {
  if (!Number.isInteger(quantidade) || quantidade <= 0) return "Informe um número inteiro de créditos.";
  if (quantidade > disponivel) return `Só há ${disponivel} créditos nesta oferta.`;
  return null;
}

/** Desconto em relação ao preço de referência de 1 crédito (R$ 1,00). */
export function descontoPercentual(precoUnitario: number, referencia = 1) {
  if (!(referencia > 0) || precoUnitario >= referencia) return 0;
  return Math.round((1 - precoUnitario / referencia) * 100);
}

/** Minutos que faltam para a reserva vencer (nunca negativo). */
export function minutosRestantes(expiraEm: string, agora = new Date()) {
  return Math.max(0, Math.ceil((+new Date(expiraEm) - +agora) / 60000));
}

export const rotuloStatusCompra: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  aprovado: "Pagamento aprovado",
  creditado: "Créditos liberados",
  expirada: "Reserva vencida",
  cancelada: "Cancelada",
};
