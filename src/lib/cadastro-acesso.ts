import { supabase } from "@/integrations/supabase/client";

/** Valida senha e confirmação. Retorna mensagem de erro ou null. */
export function validarSenhas(senha: string, confirmar: string): string | null {
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (senha !== confirmar) return "As senhas não coincidem. Digite a mesma senha nos dois campos.";
  return null;
}

/** Valida CPF pelos dígitos verificadores. */
export function cpfValido(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function formatarCpf(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Cria a conta de acesso (e-mail + senha). Retorna mensagem de erro ou null. */
export async function criarAcesso(email: string, senha: string, voltarPara = "/"): Promise<string | null> {
  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: senha,
    options: { emailRedirectTo: window.location.origin + voltarPara },
  });
  if (!error) return null;
  if (/registered|exists/i.test(error.message)) return "Este e-mail já possui conta. Use Entrar ou Esqueci minha senha.";
  return "Não foi possível criar o acesso: " + error.message;
}

/** Envia um documento do candidato a motorista. Retorna o caminho salvo. */
export async function enviarDocumento(cpf: string, tipo: string, arquivo: File): Promise<string> {
  const ext = (arquivo.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const caminho = `cadastro/${cpf.replace(/\D/g, "")}/${tipo}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("documentos-motorista").upload(caminho, arquivo, { upsert: false });
  if (error) throw new Error(error.message);
  return caminho;
}
