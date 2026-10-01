/** Status de habilitação do motorista — só Administrador ou Gerente corporativo alteram. */
export type StatusMotorista = "pendente" | "ativo" | "suspenso" | "bloqueado";
export type Aprovador = "Administrador" | "Gerente corporativo";

export const STATUS_MOTORISTA: StatusMotorista[] = ["pendente", "ativo", "suspenso", "bloqueado"];
export const APROVADORES: Aprovador[] = ["Administrador", "Gerente corporativo"];

export const ROTULO_STATUS: Record<StatusMotorista, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  suspenso: "Suspenso",
  bloqueado: "Bloqueado",
};

export const DESCRICAO_STATUS: Record<StatusMotorista, string> = {
  pendente: "Cadastro aguardando aprovação do Administrador ou Gerente corporativo.",
  ativo: "Autorizado a receber corridas na plataforma.",
  suspenso: "Acesso temporariamente suspenso. Não recebe novas corridas.",
  bloqueado: "Acesso bloqueado. Não pode operar na plataforma.",
};

export const CLASSE_STATUS: Record<StatusMotorista, string> = {
  pendente: "bg-secondary text-muted-foreground",
  ativo: "bg-primary/15 text-primary",
  suspenso: "bg-accent text-accent-foreground",
  bloqueado: "bg-destructive/15 text-destructive",
};

export type RegistroStatus = {
  status: StatusMotorista;
  por?: Aprovador;
  motivo?: string | undefined;
  atualizadoEm: string;
};

const CHAVE = "seuchauffeur-status-motoristas";

export function carregarStatus(): Record<string, RegistroStatus> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}");
  } catch {
    return {};
  }
}

function salvar(mapa: Record<string, RegistroStatus>) {
  window.localStorage.setItem(CHAVE, JSON.stringify(mapa));
}

/** Motoristas de exemplo já aprovados começam ativos; novos cadastros entram como pendentes. */
export function statusDe(mapa: Record<string, RegistroStatus>, nome: string): StatusMotorista {
  return mapa[nome]?.status ?? "ativo";
}

export function motoristaAtivo(mapa: Record<string, RegistroStatus>, nome: string) {
  return statusDe(mapa, nome) === "ativo";
}

export function registrarPendente(nome: string) {
  const mapa = carregarStatus();
  mapa[nome] = { status: "pendente", atualizadoEm: new Date().toISOString() };
  salvar(mapa);
  return mapa;
}

export function alterarStatus(nome: string, status: StatusMotorista, por: Aprovador, motivo?: string) {
  if (!APROVADORES.includes(por)) throw new Error("Somente Administrador ou Gerente corporativo podem alterar o status.");
  const mapa = carregarStatus();
  mapa[nome] = { status, por, motivo: motivo?.trim() || undefined, atualizadoEm: new Date().toISOString() };
  salvar(mapa);
  return mapa;
}
