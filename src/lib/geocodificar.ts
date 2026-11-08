// Busca de endereço em cascata (Nominatim/OpenStreetMap, gratuito).
// O texto original do cliente é preservado; aqui só obtemos coordenadas.

const CIDADES = /^(salvador|lauro de freitas|cama[cç]ari|sim[oõ]es filho|candeias|dias d.?[aá]vila|itaparica|vera cruz|madre de deus|s[aã]o francisco do conde|mata de s[aã]o jo[aã]o|feira de santana)$/i;
const COMPLEMENTO = /^(apto?|apartamento|bloco|bl|sala|lote|lt|qd|quadra|casa|edf|edif[ií]cio|condom[ií]nio|cond|andar|torre|loja|km)\b/i;

function expandir(s: string) {
  return s
    .replace(/^R\.?\s+/i, "Rua ")
    .replace(/^Av\.?\s+/i, "Avenida ")
    .replace(/^Al\.?\s+/i, "Alameda ")
    .replace(/^Tv\.?\s+/i, "Travessa ")
    .replace(/^P[cç]\.?\s+/i, "Praça ")
    .replace(/^Estr\.?\s+/i, "Estrada ")
    .replace(/^Rod\.?\s+/i, "Rodovia ");
}

/** Gera variações do endereço, da mais precisa para a mais ampla. */
export function variacoesEndereco(texto: string): string[] {
  const partes = texto
    .replace(/\b\d{5}-?\d{3}\b/g, "") // CEP
    .replace(/\s+-\s+/g, ", ")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^(ba|bahia|brasil)$/i.test(p) && !COMPLEMENTO.test(p));

  let cidade = "Salvador";
  const resto: string[] = [];
  for (const p of partes) {
    const semUf = p.replace(/\s*[-/]\s*BA$/i, "").trim();
    if (CIDADES.test(semUf)) cidade = semUf;
    else resto.push(p);
  }
  const numero = resto.find((p) => /^(n[º°o.]?\s*)?\d+[a-z]?$/i.test(p));
  const outros = resto.filter((p) => p !== numero);
  const rua = outros[0] ? expandir(outros[0]) : "";
  const bairro = outros[1] ?? "";
  const sufixo = `${cidade}, BA`;

  const lista = [
    [rua, numero, bairro].filter(Boolean).join(", "),
    [rua, numero].filter(Boolean).join(", "),
    [rua, bairro].filter(Boolean).join(", "),
    rua,
    bairro,
  ]
    .filter(Boolean)
    .map((v) => `${v}, ${sufixo}`);
  if (!lista.length) lista.push(sufixo);
  return [...new Set(lista)];
}

const cache = new Map<string, [number, number] | null>();

async function consultar(q: string): Promise<[number, number] | null> {
  if (cache.has(q)) return cache.get(q)!;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&viewbox=-38.75,-12.40,-37.90,-13.05&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
  const d = (await r.json()) as { lat: string; lon: string }[];
  const p: [number, number] | null = d[0] ? [Number(d[0].lat), Number(d[0].lon)] : null;
  cache.set(q, p);
  return p;
}

/** Retorna [lat, lng] tentando variações até encontrar. */
export async function localizarEndereco(texto: string): Promise<[number, number] | null> {
  for (const v of variacoesEndereco(texto)) {
    const p = await consultar(v);
    if (p) return p;
  }
  return null;
}
