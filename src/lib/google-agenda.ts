export const AGENDA_EMPRESA = "seuchauffeur.operacoes@gmail.com";
export const FUSO_AGENDA = "America/Bahia";

/** Converte "dd/mm/aaaa hh:mm" em "aaaammddThhmm00" (horário local). */
export function paraDataGoogle(texto: string, somarMin = 0): string | null {
  const m = texto.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5] + somarMin));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00`;
}

export function linkGoogleAgenda(e: { codigo: string; ida: string; embarque: string; destino: string; detalhes?: string; duracaoMin?: number }): string | null {
  const ini = paraDataGoogle(e.ida);
  const fim = paraDataGoogle(e.ida, e.duracaoMin ?? 60);
  if (!ini || !fim) return null;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `Corrida Seu Chauffeur - ${e.codigo}`,
    dates: `${ini}/${fim}`,
    ctz: FUSO_AGENDA,
    location: e.embarque,
    details: `Embarque: ${e.embarque}\nDestino: ${e.destino}${e.detalhes ? `\n${e.detalhes}` : ""}`,
    add: AGENDA_EMPRESA,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
