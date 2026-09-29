/** Chat mediado por IA, isolado por corrida: cada agendamento tem seu próprio histórico. */

export type OrigemMensagem = "cliente" | "motorista";

export type MensagemMediada = {
  id: string;
  origem: OrigemMensagem;
  /** Texto bruto digitado pela parte — visível apenas na auditoria/suporte. */
  original: string;
  /** Texto oficial publicado pela IA para as duas partes. */
  mediado: string;
  hora: string;
};

const CHAVE = "seuchauffeur-chat-mediado";

export type ChatsPorCorrida = Record<string, MensagemMediada[]>;

export function horaAgora() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function carregarChats(): ChatsPorCorrida {
  if (typeof window === "undefined") return {};
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as ChatsPorCorrida) : {};
  } catch {
    return {};
  }
}

export function carregarConversa(agendamentoId: string): MensagemMediada[] {
  return carregarChats()[agendamentoId] ?? [];
}

export function salvarConversa(agendamentoId: string, mensagens: MensagemMediada[]) {
  if (typeof window === "undefined") return;
  const todos = carregarChats();
  todos[agendamentoId] = mensagens;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(todos));
  } catch {
    /* armazenamento indisponível */
  }
}

export function novaMensagem(origem: OrigemMensagem, original: string, mediado: string): MensagemMediada {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    origem,
    original: original.trim(),
    mediado,
    hora: horaAgora(),
  };
}

/** Atalhos rápidos oferecidos a cada parte. */
export const ATALHOS: Record<OrigemMensagem, string[]> = {
  cliente: [
    "Já estou descendo para o local de embarque.",
    "Vou precisar de 5 minutos a mais.",
    "Estou aguardando na portaria principal.",
    "Levo duas malas grandes.",
  ],
  motorista: [
    "Saindo agora, chego em 10 minutos.",
    "Já estou posicionado no local de embarque.",
    "Trânsito intenso no trajeto, pequeno atraso.",
    "Aguardando o passageiro no ponto combinado.",
  ],
};
