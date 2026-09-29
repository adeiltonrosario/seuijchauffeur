export type PublicoAnuncio = "clientes" | "motoristas" | "ambos";

export type Anuncio = {
  id: string;
  titulo: string;
  chamada: string;
  imagem: string;
  link: string;
  cta: string;
  publico: PublicoAnuncio;
  ativo: boolean;
};

export const rotuloPublico: Record<PublicoAnuncio, string> = {
  clientes: "Clientes",
  motoristas: "Motoristas",
  ambos: "Ambos",
};

export const INTERVALO_ROTACAO_MS = 7000;

const CHAVE = "seuchauffeur-publicidades";

export const ANUNCIOS_INICIAIS: Anuncio[] = [
  {
    id: "AD-1",
    titulo: "Entregas Express Bahia",
    chamada: "Envie encomendas com rastreio em tempo real e desconto exclusivo para usuários seuchauffeur.",
    imagem: "",
    link: "https://play.google.com/store",
    cta: "Baixar na Play Store",
    publico: "ambos",
    ativo: true,
  },
  {
    id: "AD-2",
    titulo: "SeuGuincho 24h",
    chamada: "Assistência veicular na hora, em toda a Grande Salvador, com atendimento noturno.",
    imagem: "",
    link: "https://play.google.com/store",
    cta: "Conhecer agora",
    publico: "ambos",
    ativo: true,
  },
  {
    id: "AD-3",
    titulo: "SeuChauffeur Empresas",
    chamada: "Gestão de transporte corporativo com relatórios mensais e faturamento centralizado.",
    imagem: "",
    link: "https://play.google.com/store",
    cta: "Falar com consultor",
    publico: "clientes",
    ativo: true,
  },
];

export function carregarAnuncios(): Anuncio[] {
  if (typeof window === "undefined") return ANUNCIOS_INICIAIS;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return ANUNCIOS_INICIAIS;
    const dados = JSON.parse(bruto) as Anuncio[];
    return Array.isArray(dados) ? dados : ANUNCIOS_INICIAIS;
  } catch {
    return ANUNCIOS_INICIAIS;
  }
}

export function salvarAnuncios(anuncios: Anuncio[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE, JSON.stringify(anuncios));
}

export function anunciosVisiveis(anuncios: Anuncio[], publico: "clientes" | "motoristas"): Anuncio[] {
  return anuncios.filter((a) => a.ativo && (a.publico === "ambos" || a.publico === publico));
}

export function novoId(): string {
  return `AD-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
