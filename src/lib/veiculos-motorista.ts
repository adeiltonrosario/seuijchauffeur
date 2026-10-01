import { agendamentos, capacidadeValida, ehCategoriaCarga, faixaCapacidade, type CategoriaVeiculo } from "@/lib/dados";
import type { Aprovador } from "@/lib/status-motorista";

export type StatusVeiculo = "pendente" | "aprovado" | "suspenso" | "rejeitado";

export const ROTULO_STATUS_VEICULO: Record<StatusVeiculo, string> = {
  pendente: "Pendente de análise",
  aprovado: "Aprovado",
  suspenso: "Suspenso",
  rejeitado: "Rejeitado",
};

export const CLASSE_STATUS_VEICULO: Record<StatusVeiculo, string> = {
  pendente: "border-warning/40 bg-warning/10 text-warning",
  aprovado: "border-primary/40 bg-primary/10 text-primary",
  suspenso: "border-border bg-secondary/60 text-muted-foreground",
  rejeitado: "border-destructive/40 bg-destructive/10 text-destructive",
};

export type CategoriaCnh = "B" | "C" | "D" | "E";
export const CATEGORIAS_CNH: CategoriaCnh[] = ["B", "C", "D", "E"];

export type VeiculoMotorista = {
  id: string;
  motorista: string;
  placa: string;
  modelo: string;
  cor: string;
  categoria: CategoriaVeiculo;
  capacidade: number;
  /** Dados do CRLV */
  renavam: string;
  numeroCrlv: string;
  exercicioCrlv: string;
  /** Dados da CNH do motorista */
  cnhNumero: string;
  cnhCategoria: CategoriaCnh;
  cnhValidade: string;
  cnhEar: boolean;
  status: StatusVeiculo;
  aprovador?: Aprovador;
  motivo?: string;
  decididoEm?: string;
  criadoEm: string;
  /** Veículo escalado para operar hoje (evita conflito entre carros do mesmo motorista). */
  emUso: boolean;
};

const CHAVE_STORAGE = "seuchauffeur-veiculos-motorista";

export function carregarVeiculosMotorista(): VeiculoMotorista[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE_STORAGE);
    return bruto ? (JSON.parse(bruto) as VeiculoMotorista[]) : [];
  } catch {
    return [];
  }
}

export function salvarVeiculosMotorista(lista: VeiculoMotorista[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lista));
}

/** Categorias de CNH aceitas para a categoria do veículo. */
export function cnhExigida(categoria: string): CategoriaCnh[] {
  if (categoria === "Van executiva") return ["D", "E"];
  if (categoria === "Caminhão VUC / Baú 3/4") return ["C", "D", "E"];
  if (ehCategoriaCarga(categoria)) return ["B", "C", "D", "E"];
  return ["B", "C", "D", "E"];
}

export type DadosSolicitacao = Omit<
  VeiculoMotorista,
  "id" | "status" | "criadoEm" | "emUso" | "aprovador" | "motivo" | "decididoEm"
>;

/** Valida CRLV, CNH e lotação antes de abrir a solicitação. */
export function validarSolicitacao(d: DadosSolicitacao): string | null {
  if (!d.placa.trim() || !d.modelo.trim() || !d.cor.trim()) return "Preencha placa, modelo e cor do veículo.";
  if (d.renavam.replace(/\D/g, "").length < 9) return "Informe o Renavam do CRLV (ao menos 9 dígitos).";
  if (!d.numeroCrlv.trim()) return "Informe o número do CRLV.";
  if (!/^\d{4}$/.test(d.exercicioCrlv.trim())) return "Informe o ano de exercício do licenciamento (ex.: 2026).";
  if (d.cnhNumero.replace(/\D/g, "").length < 9) return "Informe o número de registro da CNH (11 dígitos).";
  if (!d.cnhValidade.trim()) return "Informe a data de validade da CNH.";
  const validade = new Date(d.cnhValidade);
  if (Number.isNaN(validade.getTime())) return "Data de validade da CNH inválida.";
  if (validade.getTime() < Date.now()) return "A CNH informada está vencida.";
  if (!d.cnhEar) return "É obrigatório ter a observação EAR (atividade remunerada) na CNH.";
  const aceitas = cnhExigida(d.categoria);
  if (!aceitas.includes(d.cnhCategoria))
    return `Categoria de CNH incompatível: ${d.categoria} exige CNH ${aceitas.join(" ou ")}.`;
  const faixa = faixaCapacidade(d.categoria);
  if (faixa.ajustavel && (d.capacidade < faixa.min || d.capacidade > faixa.max))
    return `Informe a lotação entre ${faixa.min} e ${faixa.max} ocupantes, conforme o CRLV.`;
  return null;
}

/** Cria a solicitação sempre com status pendente — o motorista não libera o próprio veículo. */
export function solicitarVeiculo(lista: VeiculoMotorista[], d: DadosSolicitacao): VeiculoMotorista[] {
  const novo: VeiculoMotorista = {
    ...d,
    placa: d.placa.toUpperCase(),
    capacidade: capacidadeValida(d.categoria, d.capacidade),
    id: `VM-${Date.now().toString(36).toUpperCase()}`,
    status: "pendente",
    criadoEm: new Date().toISOString(),
    emUso: false,
  };
  const atualizada = [...lista.filter((v) => v.placa !== novo.placa || v.motorista !== novo.motorista), novo];
  salvarVeiculosMotorista(atualizada);
  return atualizada;
}

/** Somente Administrador ou Gerente corporativo decide o status do veículo. */
export function decidirVeiculo(
  lista: VeiculoMotorista[],
  id: string,
  status: StatusVeiculo,
  aprovador: Aprovador,
  motivo?: string,
): VeiculoMotorista[] {
  const atualizada = lista.map((v) =>
    v.id === id
      ? {
          ...v,
          status,
          aprovador,
          motivo: motivo?.trim() ? motivo.trim() : undefined,
          decididoEm: new Date().toISOString(),
          emUso: status === "aprovado" ? v.emUso : false,
        }
      : v,
  );
  salvarVeiculosMotorista(atualizada);
  return atualizada;
}

export function excluirVeiculoMotorista(lista: VeiculoMotorista[], id: string): VeiculoMotorista[] {
  const atualizada = lista.filter((v) => v.id !== id);
  salvarVeiculosMotorista(atualizada);
  return atualizada;
}

export const veiculosDoMotorista = (lista: VeiculoMotorista[], nome: string) =>
  lista.filter((v) => v.motorista === nome);

export const veiculosAprovados = (lista: VeiculoMotorista[], nome: string) =>
  veiculosDoMotorista(lista, nome).filter((v) => v.status === "aprovado");

export const pendentesDeAutorizacao = (lista: VeiculoMotorista[]) =>
  lista.filter((v) => v.status === "pendente");

/** Marca um único veículo aprovado como escalado para operar. */
export function definirEmUso(lista: VeiculoMotorista[], id: string): VeiculoMotorista[] {
  const alvo = lista.find((v) => v.id === id);
  if (!alvo || alvo.status !== "aprovado") return lista;
  const atualizada = lista.map((v) =>
    v.motorista === alvo.motorista ? { ...v, emUso: v.id === id } : v,
  );
  salvarVeiculosMotorista(atualizada);
  return atualizada;
}

export const veiculoEmOperacao = (lista: VeiculoMotorista[], nome: string) =>
  veiculosAprovados(lista, nome).find((v) => v.emUso);

const MINUTOS_BLOQUEIO = 90;

const emMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const dataBR = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

/**
 * Conflito de agenda: a reserva é da pessoa do motorista, não da placa.
 * Se ele já tem corrida próxima daquele horário, não pode ser agendado em outro veículo.
 */
export function motoristaComConflito(nome: string, data: Date, horario: string): boolean {
  const dia = dataBR(data);
  const alvo = emMinutos(horario);
  return agendamentos.some((a) => {
    if (a.motorista !== nome) return false;
    if (a.status === "cancelado" || a.status === "concluido") return false;
    return [a.ida, a.retorno].some((quando) => {
      if (!quando) return false;
      const [diaAg, horaAg] = quando.split(" ");
      if (diaAg !== dia || !horaAg) return false;
      return Math.abs(emMinutos(horaAg) - alvo) < MINUTOS_BLOQUEIO;
    });
  });
}
