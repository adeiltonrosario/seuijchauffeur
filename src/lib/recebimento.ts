/**
 * Cadastro de contas de recebimento (chave Pix e dados bancários) dos motoristas.
 * Armazenamento local de demonstração — sem backend real ainda.
 */

const CHAVE_STORAGE = "seuchauffeur-contas-recebimento";

export type TipoChavePix = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

export type TipoConta = "corrente" | "poupanca" | "pagamento";

export type ContaRecebimento = {
  /** Nome do motorista titular do cadastro. */
  motorista: string;
  tipoChave: TipoChavePix;
  chavePix: string;
  titular: string;
  documento: string;
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: TipoConta;
  atualizadoEm: string;
};

export const ROTULOS_CHAVE: Record<TipoChavePix, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave aleatória",
};

export const ROTULOS_CONTA: Record<TipoConta, string> = {
  corrente: "Conta corrente",
  poupanca: "Conta poupança",
  pagamento: "Conta de pagamento",
};

export const PLACEHOLDER_CHAVE: Record<TipoChavePix, string> = {
  cpf: "000.000.000-00",
  cnpj: "00.000.000/0000-00",
  email: "nome@email.com",
  telefone: "(11) 90000-0000",
  aleatoria: "chave aleatória gerada pelo banco",
};

const somenteDigitos = (valor: string) => valor.replace(/\D/g, "");

/** Valida a chave Pix de acordo com o tipo escolhido. Retorna null quando está correta. */
export function validarChavePix(tipo: TipoChavePix, chave: string): string | null {
  const limpa = chave.trim();
  if (!limpa) return "Informe a chave Pix.";
  if (tipo === "cpf") {
    return somenteDigitos(limpa).length === 11 ? null : "O CPF deve ter 11 dígitos.";
  }
  if (tipo === "cnpj") {
    return somenteDigitos(limpa).length === 14 ? null : "O CNPJ deve ter 14 dígitos.";
  }
  if (tipo === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpa) ? null : "Informe um e-mail válido.";
  }
  if (tipo === "telefone") {
    const digitos = somenteDigitos(limpa);
    return digitos.length === 10 || digitos.length === 11
      ? null
      : "O telefone deve ter DDD e 8 ou 9 dígitos.";
  }
  return limpa.length >= 20 ? null : "A chave aleatória tem 32 caracteres fornecidos pelo banco.";
}

/** Valida todo o cadastro. Retorna a primeira mensagem de erro encontrada, ou null. */
export function validarConta(conta: Partial<ContaRecebimento>): string | null {
  if (!conta.titular?.trim()) return "Informe o nome completo do titular da conta.";
  const documento = somenteDigitos(conta.documento ?? "");
  if (documento.length !== 11 && documento.length !== 14) {
    return "Informe o CPF (11 dígitos) ou CNPJ (14 dígitos) do titular.";
  }
  return validarChavePix(conta.tipoChave ?? "cpf", conta.chavePix ?? "");
}

/** Oculta parte da chave para exibição segura em telas e comprovantes. */
export function mascararChave(chave: string): string {
  const limpa = chave.trim();
  if (limpa.includes("@")) {
    const [usuario, dominio] = limpa.split("@");
    const inicio = (usuario ?? "").slice(0, 2);
    return `${inicio}${"•".repeat(Math.max(3, (usuario ?? "").length - 2))}@${dominio}`;
  }
  if (limpa.length <= 4) return limpa;
  return `${"•".repeat(Math.max(4, limpa.length - 4))}${limpa.slice(-4)}`;
}

export function carregarContas(): ContaRecebimento[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return [];
    const lista = JSON.parse(bruto) as ContaRecebimento[];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function salvarContas(lista: ContaRecebimento[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lista));
}

export function contaDoMotorista(lista: ContaRecebimento[], motorista: string) {
  return lista.find((c) => c.motorista === motorista);
}

/** Insere ou atualiza o cadastro de um motorista, preservando os demais. */
export function gravarConta(lista: ContaRecebimento[], conta: ContaRecebimento): ContaRecebimento[] {
  const outros = lista.filter((c) => c.motorista !== conta.motorista);
  return [...outros, { ...conta, atualizadoEm: new Date().toISOString() }];
}

export function removerConta(lista: ContaRecebimento[], motorista: string) {
  return lista.filter((c) => c.motorista !== motorista);
}

export function formatarAtualizacao(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}
