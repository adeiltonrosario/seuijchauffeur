/** Converte texto no padrão brasileiro ("1.234,56", "2,5", "2.50") em número. */
export function lerMoeda(texto: string): number {
  let t = String(texto ?? "").replace(/[^\d.,-]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Mostra um número com duas casas decimais no padrão brasileiro (sem "R$"). */
export function mostrarMoeda(valor: number): string {
  return (Number.isFinite(valor) ? valor : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
