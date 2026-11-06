/** Regras puras do orçamento livre (página pública). */

export const MINIMO_POR_KM = 1.85;
/** Intervalo mínimo entre corridas da frota no mesmo horário (minutos). */
export const JANELA_CONFLITO_MIN = 90;
export const STATUS_INATIVOS = ["cancelada", "cancelado", "concluida", "concluido", "concluída", "recusada"];

const BLOQUEADAS = /casa(s)? de apoio|esportivo|clube|plantonista|teste|carreto|mudan[cç]a|escolar/i;

export type ModalidadeBanco = {
  nome: string; caracteristicas: string; por_km: number; por_turno: boolean;
  valor_turno: number; franquia_km: number;
};

export const modalidadeLivre = (nome: string) => !BLOQUEADAS.test(nome);

export function valorModalidade(m: ModalidadeBanco, km: number): number {
  const tarifa = Math.max(Number(m.por_km) || 0, MINIMO_POR_KM);
  if (m.por_turno) {
    const exced = Math.max(0, km - (Number(m.franquia_km) || 0));
    return Math.round((Number(m.valor_turno) + exced * tarifa) * 100) / 100;
  }
  return Math.round(km * tarifa * 100) / 100;
}

/** "dd/mm/aaaa HH:MM" → minutos desde época (horário local de Brasília, comparação relativa). */
export function paraMinutos(ida: string): number | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/.exec(ida.trim());
  if (!m) return null;
  return Date.UTC(+m[3]!, +m[2]! - 1, +m[1]!, +m[4]!, +m[5]!) / 60000;
}

/** Há conflito quando as corridas ativas na janela já ocupam todos os motoristas ativos. */
export function haConflito(novaIda: string, idasExistentes: string[], motoristasAtivos: number): boolean {
  const alvo = paraMinutos(novaIda);
  if (alvo === null) return true;
  const ocupadas = idasExistentes.filter((i) => {
    const t = paraMinutos(i);
    return t !== null && Math.abs(t - alvo) < JANELA_CONFLITO_MIN;
  }).length;
  return ocupadas >= Math.max(1, motoristasAtivos);
}

/** Desconto para quem fecha a corrida agora no Pix. */
export const DESCONTO_PIX = 0.1;

/** Valor final: ida e volta dobra os km; Pix tem 10% de desconto. */
export function valorFinal(m: ModalidadeBanco, kmTrecho: number, idaVolta: boolean, pagamento: "Pix" | "Cartão"): number {
  const base = valorModalidade(m, idaVolta ? kmTrecho * 2 : kmTrecho);
  return pagamento === "Pix" ? Math.round(base * (1 - DESCONTO_PIX) * 100) / 100 : base;
}
