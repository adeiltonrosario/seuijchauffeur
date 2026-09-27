export type StatusDia = "disponivel" | "indisponivel";

export type RegistroDia = {
  status: StatusDia;
  inicio: string;
  fim: string;
};

/** Agenda por motorista: nome → data (AAAA-MM-DD) → registro. */
export type AgendaMotoristas = Record<string, Record<string, RegistroDia>>;

const CHAVE_STORAGE = "seuchauffeur-disponibilidade";

/** Motorista usado na tela de disponibilidade (demonstração). */
export const MOTORISTA_ATUAL = "Marcos Vinícius";

export function chaveData(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function carregarAgenda(): AgendaMotoristas {
  if (typeof window === "undefined") return {};
  try {
    const bruto = window.localStorage.getItem(CHAVE_STORAGE);
    return bruto ? (JSON.parse(bruto) as AgendaMotoristas) : {};
  } catch {
    return {};
  }
}

export function salvarAgenda(agenda: AgendaMotoristas) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE_STORAGE, JSON.stringify(agenda));
}

/**
 * Um motorista aparece para o cliente quando:
 * - não marcou nada no dia (disponibilidade geral), ou
 * - marcou "disponível" e o horário da corrida está dentro da faixa.
 * Marcou "indisponível" → nunca aparece naquele dia.
 */
export function motoristaDisponivel(
  agenda: AgendaMotoristas,
  nomeMotorista: string,
  data: Date,
  horario: string,
): boolean {
  const registro = agenda[nomeMotorista]?.[chaveData(data)];
  if (!registro) return true;
  if (registro.status === "indisponivel") return false;
  return horario >= registro.inicio && horario <= registro.fim;
}
