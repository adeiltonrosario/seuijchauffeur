import { VALOR_MINIMO_POR_KM, calcularValorCorrida } from "@/lib/dados";
import { motoristaDisponivel, type AgendaMotoristas } from "@/lib/disponibilidade";

/** Desconto aplicado quando o cliente contrata 2 ou mais trechos no mesmo dia. */
export const DESCONTO_JORNADA = 0.15;
/** Minutos antes do embarque em que o motorista recebe o pedido de confirmação de prontidão. */
export const CHECKIN_ANTECEDENCIA_MIN = 45;
/** Sem confirmação até este limite, a plataforma aciona a rede de backup. */
export const BACKUP_LIMITE_MIN = 30;
/** Minutos de antecedência com que o motorista aguarda no ponto de acesso. */
export const ANTECEDENCIA_EMBARQUE_MIN = 10;

export const PONTOS_ACESSO = [
  "Portaria do corpo clínico",
  "Entrada da emergência",
  "Recepção geral",
  "Estacionamento dos médicos",
  "Portaria do batalhão / delegacia",
  "Residência do cliente",
] as const;

export type PontoAcesso = (typeof PONTOS_ACESSO)[number];

export type TrechoPlantao = {
  id: number;
  /** Rótulo livre do trecho, ex.: "Início do plantão". */
  rotulo: string;
  origem: string;
  destino: string;
  /** Horário de embarque (HH:MM). */
  horario: string;
  /** Horário em que o plantão começa no destino (informativo). */
  entradaPlantao: string;
  acesso: PontoAcesso;
  distancia: number;
};

/** Atalhos de escala para marcar vários dias no calendário. */
export const ESCALAS = [
  { id: "avulso", rotulo: "Dias avulsos", intervaloDias: 0, ocorrencias: 1 },
  { id: "12x36", rotulo: "12x36 (dia sim, dia não)", intervaloDias: 2, ocorrencias: 8 },
  { id: "24x72", rotulo: "24x72 (a cada 4 dias)", intervaloDias: 4, ocorrencias: 6 },
  { id: "semanal", rotulo: "1x por semana", intervaloDias: 7, ocorrencias: 4 },
] as const;

export type EscalaId = (typeof ESCALAS)[number]["id"];

export const somarDiasData = (d: Date, dias: number) => {
  const nova = new Date(d);
  nova.setDate(nova.getDate() + dias);
  return nova;
};

/** Gera as datas da escala a partir do primeiro dia de plantão. */
export function gerarDiasDaEscala(inicio: Date, escala: EscalaId): Date[] {
  const cfg = ESCALAS.find((e) => e.id === escala) ?? ESCALAS[0];
  if (cfg.intervaloDias === 0) return [inicio];
  return Array.from({ length: cfg.ocorrencias }, (_, i) => somarDiasData(inicio, i * cfg.intervaloDias));
}

export type ResumoJornada = {
  kmTotal: number;
  bruto: number;
  desconto: number;
  porDia: number;
  dias: number;
  total: number;
};

/**
 * Valor de um dia de plantão: soma dos trechos com desconto de jornada
 * quando há 2 ou mais trechos, multiplicado pelos dias da escala.
 */
export function calcularJornada(
  trechos: TrechoPlantao[],
  valorPorKm: number,
  dias: number,
  taxaServico: number,
): ResumoJornada {
  const tarifa = Math.max(valorPorKm, VALOR_MINIMO_POR_KM);
  const kmTotal = trechos.reduce((t, tr) => t + (Number.isFinite(tr.distancia) ? tr.distancia : 0), 0);
  const bruto = calcularValorCorrida(kmTotal, tarifa);
  const desconto = trechos.length >= 2 ? Math.round(bruto * DESCONTO_JORNADA * 100) / 100 : 0;
  const porDia = Math.round((bruto - desconto + taxaServico) * 100) / 100;
  const quantidade = Math.max(1, dias);
  return {
    kmTotal: Math.round(kmTotal * 100) / 100,
    bruto,
    desconto,
    porDia,
    dias: quantidade,
    total: Math.round(porDia * quantidade * 100) / 100,
  };
}

export type AlocacaoTrecho = {
  trechoId: number;
  motorista: string | null;
  backup: string | null;
  dedicado: boolean;
};

/**
 * Aloca condutores para a jornada. Com motorista dedicado, o preferido só
 * assume todos os trechos se estiver disponível em todos os horários;
 * caso contrário cada trecho recebe o motorista disponível no horário.
 * Sempre reserva um backup para evitar falha de atendimento.
 */
export function alocarJornada(
  trechos: TrechoPlantao[],
  candidatos: string[],
  agenda: AgendaMotoristas,
  dia: Date,
  preferido: string | null,
  manterMesmo: boolean,
): AlocacaoTrecho[] {
  const disponiveisEm = (horario: string) =>
    candidatos.filter((nome) => motoristaDisponivel(agenda, nome, dia, horario));

  const preferidoCobreTudo =
    !!preferido && manterMesmo && trechos.every((t) => disponiveisEm(t.horario).includes(preferido));

  return trechos.map((t) => {
    const livres = disponiveisEm(t.horario);
    const titular = preferidoCobreTudo
      ? preferido
      : (preferido && livres.includes(preferido) ? preferido : livres[0]) ?? null;
    const backup = livres.find((n) => n !== titular) ?? null;
    return { trechoId: t.id, motorista: titular, backup, dedicado: preferidoCobreTudo };
  });
}

/** Subtrai minutos de um horário HH:MM. */
export function horarioMenos(horario: string, minutos: number): string {
  const [h = "0", m = "0"] = horario.split(":");
  const total = Number(h) * 60 + Number(m) - minutos;
  const normal = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normal / 60)).padStart(2, "0")}:${String(normal % 60).padStart(2, "0")}`;
}
