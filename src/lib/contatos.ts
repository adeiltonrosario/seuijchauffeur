/**
 * Contato obrigatório de clientes e motoristas: e-mail e telefone com WhatsApp.
 * Validação simples e local, sem dependência de backend.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Mantém apenas dígitos do telefone (máximo 11 para DDD + número). */
export function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 11);
}

/** Formata progressivamente como (71) 99680-5321. */
export function formatarTelefone(valor: string) {
  const d = somenteDigitos(valor);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function emailValido(email: string) {
  const limpo = email.trim();
  return limpo.length > 0 && limpo.length <= 255 && EMAIL_REGEX.test(limpo);
}

/** Celular brasileiro com DDD: 11 dígitos começando o número por 9. */
export function whatsappValido(telefone: string) {
  const d = somenteDigitos(telefone);
  return d.length === 11 && d[2] === "9" && Number(d.slice(0, 2)) >= 11;
}

/** Retorna a mensagem de erro, ou null quando ambos os contatos estão válidos. */
export function validarContato(email: string, telefone: string): string | null {
  if (!email.trim()) return "Informe o e-mail. O campo é obrigatório.";
  if (!emailValido(email)) return "E-mail inválido. Use o formato nome@dominio.com.";
  if (!telefone.trim()) return "Informe o telefone com WhatsApp. O campo é obrigatório.";
  if (!whatsappValido(telefone)) {
    return "Telefone inválido. Informe DDD e celular com 9 dígitos, ex.: (71) 99680-5321.";
  }
  return null;
}

/** Link direto de conversa no WhatsApp. */
export function linkWhatsapp(telefone: string) {
  return `https://wa.me/55${somenteDigitos(telefone)}`;
}
