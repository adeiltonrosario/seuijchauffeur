/**
 * Persistência real (Lovable Cloud) de clientes, motoristas e veículos.
 * As telas continuam lendo uma cópia local para respostas instantâneas;
 * toda gravação vai para o banco e a cópia local é reidratada a partir dele.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CategoriaVeiculo } from "@/lib/dados";
import type { Aprovador, RegistroStatus, StatusMotorista } from "@/lib/status-motorista";
import type { CategoriaCnh, StatusVeiculo, VeiculoMotorista } from "@/lib/veiculos-motorista";

const CHAVE_STATUS = "seuchauffeur-status-motoristas";
const CHAVE_VEICULOS = "seuchauffeur-veiculos-motorista";

export type MotoristaBanco = {
  nome: string;
  email: string;
  whatsapp: string;
  status: StatusMotorista;
  veiculo: string;
  placa: string;
  categoria: CategoriaVeiculo;
  valor: number;
  ajudantes: number;
  valorAjudante: number;
  cpf?: string;
  cnh?: string;
  documentos?: Record<string, string>;
};

export type VeiculoFrota = {
  placa: string;
  modelo: string;
  cor: string;
  categoria: CategoriaVeiculo;
  capacidade: number;
};

function avisar(contexto: string, erro: { message: string } | null) {
  if (erro) console.error(`[banco] ${contexto}:`, erro.message);
}

/* ---------- Clientes ---------- */
export async function cadastrarCliente(nome: string, email: string, whatsapp: string): Promise<string | null> {
  const { error } = await supabase
    .from("clientes")
    .insert({ nome: nome.trim(), email: email.trim().toLowerCase(), telefone_whatsapp: whatsapp.trim() });
  if (error?.code === "23505") return "Este e-mail já está cadastrado.";
  if (error) return "Não foi possível salvar o cadastro. Tente novamente.";
  return null;
}

/* ---------- Motoristas ---------- */
export async function gravarMotorista(m: Partial<MotoristaBanco> & { nome: string }) {
  const linha: Record<string, unknown> = { nome: m.nome, atualizado_em: new Date().toISOString() };
  if (m.email !== undefined) linha["email"] = m.email;
  if (m.whatsapp !== undefined) linha["telefone_whatsapp"] = m.whatsapp;
  if (m.status !== undefined) linha["status"] = m.status;
  if (m.veiculo !== undefined) linha["veiculo"] = m.veiculo;
  if (m.placa !== undefined) linha["placa"] = m.placa;
  if (m.categoria !== undefined) linha["categoria"] = m.categoria;
  if (m.valor !== undefined) linha["valor"] = m.valor;
  if (m.ajudantes !== undefined) linha["ajudantes"] = m.ajudantes;
  if (m.valorAjudante !== undefined) linha["valor_ajudante"] = m.valorAjudante;
  if (m.cpf !== undefined) linha["cpf"] = m.cpf;
  if (m.cnh !== undefined) linha["cnh"] = m.cnh;
  if (m.documentos !== undefined) linha["documentos"] = m.documentos;
  const { error } = await supabase.from("motoristas").upsert(linha as never, { onConflict: "nome" });
  avisar("gravar motorista", error);
}

export async function gravarStatusMotorista(nome: string, reg: RegistroStatus) {
  const { error } = await supabase.from("motoristas").upsert(
    {
      nome,
      status: reg.status,
      alterado_por: reg.por ?? null,
      motivo_status: reg.motivo ?? null,
      atualizado_em: reg.atualizadoEm,
    },
    { onConflict: "nome" },
  );
  avisar("gravar status", error);
}

export async function listarMotoristas(): Promise<MotoristaBanco[]> {
  const { data, error } = await supabase.from("motoristas").select("*").order("criado_em");
  avisar("listar motoristas", error);
  return (data ?? []).map((r) => ({
    nome: r.nome,
    email: r.email,
    whatsapp: r.telefone_whatsapp,
    status: r.status as StatusMotorista,
    veiculo: r.veiculo,
    placa: r.placa,
    categoria: r.categoria as CategoriaVeiculo,
    valor: Number(r.valor),
    ajudantes: r.ajudantes,
    valorAjudante: Number(r.valor_ajudante),
  }));
}

/* ---------- Veículos ---------- */
function paraLinha(v: VeiculoMotorista) {
  return {
    id: v.id,
    motorista: v.motorista,
    placa: v.placa,
    modelo: v.modelo,
    cor: v.cor,
    categoria: v.categoria,
    capacidade: v.capacidade,
    renavam: v.renavam,
    numero_crlv: v.numeroCrlv,
    exercicio_crlv: v.exercicioCrlv,
    cnh_numero: v.cnhNumero,
    cnh_categoria: v.cnhCategoria,
    cnh_validade: v.cnhValidade,
    cnh_ear: v.cnhEar,
    status: v.status,
    origem: "solicitacao",
    aprovador: v.aprovador ?? null,
    motivo: v.motivo ?? null,
    decidido_em: v.decididoEm ?? null,
    em_uso: v.emUso,
    criado_em: v.criadoEm,
  };
}

export async function gravarVeiculosSolicitados(lista: VeiculoMotorista[]) {
  if (lista.length === 0) return;
  const { error } = await supabase.from("veiculos").upsert(lista.map(paraLinha));
  avisar("gravar veículos", error);
}

export async function excluirVeiculo(id: string) {
  const { error } = await supabase.from("veiculos").delete().eq("id", id);
  avisar("excluir veículo", error);
}

export async function gravarVeiculoFrota(v: VeiculoFrota, motorista?: string) {
  const { error } = await supabase.from("veiculos").upsert({
    id: `FROTA-${v.placa.toUpperCase()}`,
    motorista: motorista ?? null,
    placa: v.placa.toUpperCase(),
    modelo: v.modelo,
    cor: v.cor,
    categoria: v.categoria,
    capacidade: v.capacidade,
    status: "aprovado",
    origem: "frota",
  });
  avisar("gravar frota", error);
}

export async function listarFrota(): Promise<VeiculoFrota[]> {
  const { data, error } = await supabase.from("veiculos").select("*").eq("origem", "frota").order("criado_em");
  avisar("listar frota", error);
  return (data ?? []).map((r) => ({
    placa: r.placa,
    modelo: r.modelo,
    cor: r.cor,
    categoria: r.categoria as CategoriaVeiculo,
    capacidade: r.capacidade,
  }));
}

/* ---------- Sincronização da cópia local ---------- */
export async function sincronizarDoBanco() {
  if (typeof window === "undefined") return;
  const [mot, vei] = await Promise.all([
    supabase.from("motoristas").select("nome,status,alterado_por,motivo_status,atualizado_em"),
    supabase.from("veiculos").select("*").eq("origem", "solicitacao"),
  ]);
  if (!mot.error && mot.data) {
    const mapa: Record<string, RegistroStatus> = {};
    for (const r of mot.data) {
      const reg: RegistroStatus = { status: r.status as StatusMotorista, atualizadoEm: r.atualizado_em };
      if (r.alterado_por) reg.por = r.alterado_por as Aprovador;
      if (r.motivo_status) reg.motivo = r.motivo_status;
      mapa[r.nome] = reg;
    }
    window.localStorage.setItem(CHAVE_STATUS, JSON.stringify(mapa));
  }
  if (!vei.error && vei.data) {
    const lista: VeiculoMotorista[] = vei.data.map((r) => {
      const v: VeiculoMotorista = {
        id: r.id,
        motorista: r.motorista ?? "",
        placa: r.placa,
        modelo: r.modelo,
        cor: r.cor,
        categoria: r.categoria as CategoriaVeiculo,
        capacidade: r.capacidade,
        renavam: r.renavam,
        numeroCrlv: r.numero_crlv,
        exercicioCrlv: r.exercicio_crlv,
        cnhNumero: r.cnh_numero,
        cnhCategoria: r.cnh_categoria as CategoriaCnh,
        cnhValidade: r.cnh_validade,
        cnhEar: r.cnh_ear,
        status: r.status as StatusVeiculo,
        criadoEm: r.criado_em,
        emUso: r.em_uso,
      };
      if (r.aprovador) v.aprovador = r.aprovador as Aprovador;
      if (r.motivo) v.motivo = r.motivo;
      if (r.decidido_em) v.decididoEm = r.decidido_em;
      return v;
    });
    window.localStorage.setItem(CHAVE_VEICULOS, JSON.stringify(lista));
  }
  window.dispatchEvent(new Event("seuchauffeur-sync"));
}
