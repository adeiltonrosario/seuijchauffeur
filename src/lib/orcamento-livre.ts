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

/** Taxa de deslocamento padrão (%) quando a volta é em outro dia. */
export const TAXA_INTERDIARIA_PADRAO = 30;

/** Ida e volta em datas diferentes ("dd/mm/aaaa HH:MM"). */
export function voltaEmOutroDia(ida: string, retorno: string | null | undefined): boolean {
  return !!retorno && ida.slice(0, 10) !== retorno.slice(0, 10);
}

/** Embute a taxa de deslocamento interdiária no valor. */
export function aplicarTaxaInterdiaria(valor: number, pct: number): number {
  return Math.round(valor * (1 + Math.max(0, pct) / 100) * 100) / 100;
}

/** Valor final: ida e volta dobra os km; volta em outro dia soma a taxa; Pix tem 10% de desconto. */
export function valorFinal(m: ModalidadeBanco, kmTrecho: number, idaVolta: boolean, pagamento: "Pix" | "Cartão", taxaInterdiariaPct = 0, ocupantes = 1, adicionalPct = 0): number {
  const base = aplicarAdicionalOcupantes(aplicarTaxaInterdiaria(valorModalidade(m, idaVolta ? kmTrecho * 2 : kmTrecho), taxaInterdiariaPct), ocupantes, adicionalPct);
  void pagamento; // desconto Pix não é automático: Admin concede no agendamento
  return base;
}

/** Adicional padrão (%) por ocupante a partir do 2º. */
export const ADICIONAL_OCUPANTE_PADRAO = 10;
export const MAX_OCUPANTES = 4;

/** Embute o adicional: o titular está incluso; cada ocupante extra soma pct% do valor. */
export function aplicarAdicionalOcupantes(valor: number, ocupantes: number, pct: number): number {
  const extras = Math.max(0, Math.min(MAX_OCUPANTES, Math.floor(ocupantes)) - 1);
  return Math.round(valor * (1 + (extras * Math.max(0, pct)) / 100) * 100) / 100;
}
