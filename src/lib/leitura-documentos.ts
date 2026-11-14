/**
 * Leitura gratuita de CNH e CRLV em PDF digital (Carteira Digital de Trânsito / gov.br).
 * Roda 100% no navegador: sem servidor, sem IA, sem custo.
 * Fotos não têm texto digital; nesses casos o motorista digita os dados.
 */

export type DadosCnh = { nome?: string; cpf?: string; registro?: string };
export type DadosCrlv = { placa?: string; marca?: string; modelo?: string; cor?: string; lotacao?: number };

const limpar = (t: string) => t.replace(/\s+/g, " ").trim();

function cpfDe(texto: string) {
  const m = texto.match(/\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/);
  return m ? `${m[1]}.${m[2]}.${m[3]}-${m[4]}` : undefined;
}

export function extrairCnh(bruto: string): DadosCnh {
  const texto = limpar(bruto);
  const nome = texto.match(/NOME(?: E SOBRENOME)?\s*:?\s*([A-ZÀ-Ú][A-ZÀ-Ú ]{4,60}?)(?=\s+(?:DOC|DATA|CPF|FILIA|\d))/)?.[1];
  const registro = texto.match(/(?:N[ºº°O]?\.?\s*REGISTRO|REGISTRO)\s*:?\s*(\d{9,11})/i)?.[1]
    ?? texto.match(/\b(\d{11})\b/)?.[1];
  return { nome: nome ? limpar(nome) : undefined, cpf: cpfDe(texto), registro };
}

export function extrairCrlv(bruto: string): DadosCrlv {
  const texto = limpar(bruto).toUpperCase();
  const placa = texto.match(/\b([A-Z]{3})-?(\d[A-Z0-9]\d{2})\b/);
  const mm = texto.match(/MARCA\s*\/\s*MODELO\s*\/\s*VERS[AÃ]O\s*:?\s*([A-Z0-9]+)\s*\/\s*([A-Z0-9 .-]+?)(?=\s+(?:ESP[EÉ]CIE|COR|ANO|CATEGORIA|COMBUST|\d{4}))/)
    ?? texto.match(/([A-Z]{2,12})\s*\/\s*([A-Z0-9 .-]{2,30}?)(?=\s+(?:ESP[EÉ]CIE|COR|ANO|\d{4}))/);
  const cor = texto.match(/COR PREDOMINANTE\s*:?\s*([A-ZÇ]+)/)?.[1];
  const lot = texto.match(/LOTA[CÇ][AÃ]O\s*:?\s*(\d{1,2})/)?.[1]
    ?? texto.match(/CAPACIDADE\s*:?\s*(\d{1,2})\s*P/)?.[1];
  const tit = (s?: string) => (s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim() : undefined);
  return {
    placa: placa ? `${placa[1]}${placa[2]}` : undefined,
    marca: tit(mm?.[1]),
    modelo: mm?.[2]?.trim(),
    cor: tit(cor),
    lotacao: lot ? Number(lot) : undefined,
  };
}

/** Lê o texto de um PDF no navegador. Retorna "" para imagens ou PDFs escaneados. */
export async function lerTextoPdf(arquivo: File): Promise<string> {
  if (arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) return "";
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  let texto = "";
  for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
    const pagina = await doc.getPage(i);
    const conteudo = await pagina.getTextContent();
    texto += " " + conteudo.items.map((it) => ("str" in it ? it.str : "")).join(" ");
  }
  return texto;
}
