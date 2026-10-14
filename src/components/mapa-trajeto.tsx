import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = { pontos: { lat: number; lng: number; rotulo: string; tipo: "origem" | "parada" | "retorno" }[]; linha: [number, number][] };

const CORES = { origem: "#22c55e", parada: "#d4af37", retorno: "#3b82f6" };

export default function MapaTrajeto({ pontos, linha }: Props) {
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camada = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!div.current || mapa.current) return;
    const m = L.map(div.current, { attributionControl: true }).setView([-12.9777, -38.5016], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", className: "mapa-escuro", maxZoom: 19 }).addTo(m);
    camada.current = L.layerGroup().addTo(m);
    mapa.current = m;
    return () => { m.remove(); mapa.current = null; };
  }, []);

  useEffect(() => {
    const c = camada.current, m = mapa.current;
    if (!c || !m) return;
    c.clearLayers();
    if (linha.length) L.polyline(linha, { color: "#d4af37", weight: 5, opacity: 0.9 }).addTo(c);
    pontos.forEach((p, i) => {
      const cor = CORES[p.tipo];
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "", iconSize: [26, 26], iconAnchor: [13, 13],
          html: `<div style="width:26px;height:26px;border-radius:50%;background:${cor};border:2px solid #111;color:#111;font:700 12px sans-serif;display:flex;align-items:center;justify-content:center">${p.tipo === "origem" ? "C" : p.tipo === "retorno" ? "R" : i}</div>`,
        }),
      }).bindTooltip(p.rotulo).addTo(c);
    });
    const todos = linha.length ? linha : pontos.map((p) => [p.lat, p.lng] as [number, number]);
    if (todos.length) m.fitBounds(L.latLngBounds(todos), { padding: [30, 30] });
  }, [pontos, linha]);

  return <div ref={div} className="h-72 w-full overflow-hidden rounded-lg border border-border/60" />;
}
