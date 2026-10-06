import { supabase } from "@/integrations/supabase/client";

export const MAX_INDICACOES = 4;
export const DESCONTO_POR_INDICACAO = 5; // % na mensalidade do titular
export const DESCONTO_INDICADO = 10; // % na 1ª mensalidade do indicado
const CHAVE_CODIGO_USADO = "seuchauffeur:codigo-indicacao-usado";

export function clienteAtual() {
  if (typeof window === "undefined") return { email: "", nome: "" };
  return {
    email: localStorage.getItem("seuchauffeur:cliente-email") ?? "",
    nome: localStorage.getItem("seuchauffeur:cliente-nome") ?? "",
  };
}

export function descontoTitular(usos: number) {
  return Math.min(usos, MAX_INDICACOES) * DESCONTO_POR_INDICACAO;
}

export async function meuCodigo(email: string, nome: string) {
  const { data, error } = await supabase.rpc("meu_codigo_indicacao", { _email: email, _nome: nome });
  if (error) throw error;
  return data as { codigo: string; usos: number; indicados: string[] };
}

/** Retorna null quando aplicado; senão a mensagem de erro. */
export async function usarCodigo(codigo: string, email: string, nome: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("usar_codigo_indicacao", { _codigo: codigo, _email: email, _nome: nome });
  if (error) return "Não foi possível validar o código agora.";
  if (data !== "ok") return String(data);
  localStorage.setItem(CHAVE_CODIGO_USADO, codigo.trim().toUpperCase());
  return null;
}

export function codigoJaUsado() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CHAVE_CODIGO_USADO) ?? "";
}
