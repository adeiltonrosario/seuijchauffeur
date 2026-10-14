import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type PontoMapa = {
  id: string;
  nome: string;
  tipo: "motorista" | "cliente";
  grupo: string;
  lat: number;
  lng: number;
};

type Props = {
  pontos: PontoMapa[];
  destacado: string | null;
  onSelecionar: (grupo: string) => void;
  zoom: number;
  versaoCentro: number;
  onRota?: (r: { km: number; minutos: number } | null) => void;
};

const CENTRO: L.LatLngTuple = [-12.9777, -38.5016];

function icone(tipo: PontoMapa["tipo"], ativo: boolean) {
  const cor = tipo === "motorista" ? "#d4af37" : "#2dd4bf";
  const tam = ativo ? 34 : 26;
  return L.divIcon({
    className: "",
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam],
    html: `<div style="width:${tam}px;height:${tam}px;background:${cor};border:2px solid #111;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 ${ativo ? 14 : 4}px ${cor}"></div>`,
  });
}

export default function MapaReal({ pontos, destacado, onSelecionar, zoom, versaoCentro, onRota }: Props) {
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camada = useRef<L.LayerGroup | null>(null);
  const rota = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!div.current || mapa.current) return;
    const m = L.map(div.current, { zoomControl: false, attributionControl: true }).setView(CENTRO, 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(m);
    camada.current = L.layerGroup().addTo(m);
    rota.current = L.layerGroup().addTo(m);
    mapa.current = m;
    return () => {
      m.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    mapa.current?.setZoom(Math.round(10 + (zoom - 1) * 3));
  }, [zoom]);

  useEffect(() => {
    if (versaoCentro > 0) mapa.current?.setView(CENTRO, 12);
  }, [versaoCentro]);

  useEffect(() => {
    const c = camada.current;
    if (!c) return;
    c.clearLayers();
    for (const p of pontos) {
      const ativo = p.grupo === destacado;
      const mk = L.marker([p.lat, p.lng], { icon: icone(p.tipo, ativo) }).on("click", () => onSelecionar(p.grupo));
      mk.bindTooltip(p.nome, { direction: "top", offset: [0, -28], permanent: ativo });
      mk.addTo(c);
    }
  }, [pontos, destacado, onSelecionar]);

  useEffect(() => {
    const r = rota.current;
    const m = mapa.current;
    if (!r || !m) return;
    r.clearLayers();
    const mot = pontos.find((p) => p.grupo === destacado && p.tipo === "motorista");
    const cli = pontos.find((p) => p.grupo === destacado && p.tipo === "cliente");
    if (!mot || !cli) {
      onRota?.(null);
      return;
    }
    let cancelado = false;
    const url = `https://router.project-osrm.org/route/v1/driving/${mot.lng},${mot.lat};${cli.lng},${cli.lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then((res) => res.json())
      .then((d) => {
        if (cancelado) return;
        const rt = d?.routes?.[0];
        const coords: L.LatLngTuple[] = rt
          ? rt.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])
          : [
              [mot.lat, mot.lng],
              [cli.lat, cli.lng],
            ];
        L.polyline(coords, { color: "#d4af37", weight: 8, opacity: 0.25 }).addTo(r);
        const linha = L.polyline(coords, { color: "#d4af37", weight: 4 }).addTo(r);
        m.fitBounds(linha.getBounds(), { padding: [80, 80] });
        if (rt) onRota?.({ km: Math.round(rt.distance / 100) / 10, minutos: Math.max(1, Math.round(rt.duration / 60)) });
      })
      .catch(() => onRota?.(null));
    return () => {
      cancelado = true;
    };
  }, [pontos, destacado, onRota]);

  return <div ref={div} className="absolute inset-0 z-0" />;
}
