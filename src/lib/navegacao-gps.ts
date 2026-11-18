// Links oficiais gratuitos do Google Maps e Waze (sem chave de API).

export function linkGoogleMapsRota(origem: string, destino: string, paradas: string[] = []) {
  const p = new URLSearchParams({ api: "1", destination: destino, travelmode: "driving" });
  if (origem.trim()) p.set("origin", origem);
  if (paradas.length) p.set("waypoints", paradas.join("|"));
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

export function linkGoogleMapsBusca(texto: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto.trim() || "Salvador, BA")}`;
}

export function linkWaze(destino: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(destino)}&navigate=yes`;
}

/** Extrai coordenadas de links/textos do Google Maps ou Waze, ou "lat, lng" colado. */
export function coordenadasDeLink(texto: string): [number, number] | null {
  const t = decodeURIComponent(texto.trim());
  const padroes = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|destination|daddr)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /^(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)$/,
  ];
  for (const r of padroes) {
    const m = t.match(r);
    if (m) {
      const lat = Number(m[1]), lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
    }
  }
  return null;
}

/** Texto do endereço dentro de links como google.com/maps/place/NOME/... */
export function enderecoDeLink(texto: string): string | null {
  const m = texto.match(/\/maps\/(?:place|search)\/([^/@?]+)/);
  return m?.[1] ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
}

export function ehLinkMapa(texto: string) {
  return /(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com)/i.test(texto);
}
