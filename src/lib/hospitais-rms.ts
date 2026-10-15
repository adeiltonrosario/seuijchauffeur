// Catálogo de hospitais frequentes de Salvador/RMS com coordenadas pré-carregadas (lat, lng).
export type Hospital = { nome: string; municipio: string; lat: number; lng: number; apelidos: string[] };

export const HOSPITAIS_RMS: Hospital[] = [
  { nome: "HUPES - Hospital das Clínicas (Canela)", municipio: "Salvador", lat: -12.9996, lng: -38.5227, apelidos: ["hupes", "hospital das clinicas", "clinicas", "edgard santos", "hospital universitario"] },
  { nome: "Hospital Aristides Maltez (Brotas)", municipio: "Salvador", lat: -12.9905, lng: -38.4963, apelidos: ["aristides maltez", "maltez"] },
  { nome: "HGE - Hospital Geral do Estado (Brotas)", municipio: "Salvador", lat: -12.9930, lng: -38.4937, apelidos: ["hge", "hospital geral do estado"] },
  { nome: "Hospital Geral Roberto Santos (Cabula)", municipio: "Salvador", lat: -12.9548, lng: -38.4766, apelidos: ["roberto santos", "hgrs"] },
  { nome: "Hospital Santo Antônio - Obras Sociais Irmã Dulce", municipio: "Salvador", lat: -12.9340, lng: -38.5040, apelidos: ["irma dulce", "osid", "santo antonio", "largo de roma"] },
  { nome: "Hospital da Bahia (Pituba)", municipio: "Salvador", lat: -12.9946, lng: -38.4590, apelidos: ["hospital da bahia"] },
  { nome: "Hospital São Rafael (São Marcos)", municipio: "Salvador", lat: -12.9227, lng: -38.4340, apelidos: ["sao rafael"] },
  { nome: "Hospital Martagão Gesteira (Tororó)", municipio: "Salvador", lat: -12.9850, lng: -38.5060, apelidos: ["martagao", "martagao gesteira"] },
  { nome: "Hospital Sarah Kubitschek (Tancredo Neves)", municipio: "Salvador", lat: -12.9810, lng: -38.4570, apelidos: ["sarah", "kubitschek"] },
  { nome: "Hospital Menandro de Faria", municipio: "Lauro de Freitas", lat: -12.8946, lng: -38.3255, apelidos: ["menandro", "menandro de faria"] },
  { nome: "Hospital Geral de Camaçari", municipio: "Camaçari", lat: -12.6976, lng: -38.3245, apelidos: ["hospital geral de camacari", "hgc"] },
];

export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Remove partes repetidas como "Salvador, Salvador, BA". */
export function limparEndereco(e: string) {
  const vistos = new Set<string>();
  return e.split(",").map((p) => p.trim()).filter((p) => {
    const k = normalizar(p);
    if (!k || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  }).join(", ");
}

export function acharHospital(texto: string): Hospital | undefined {
  const t = normalizar(texto);
  if (!t) return undefined;
  return HOSPITAIS_RMS.find((h) => t.includes(normalizar(h.nome)) || normalizar(h.nome).startsWith(t) || h.apelidos.some((a) => t.includes(a)));
}
