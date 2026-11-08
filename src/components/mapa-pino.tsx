import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CENTRO: L.LatLngTuple = [-12.9777, -38.5016];

const icone = L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  html: `<div style="width:30px;height:30px;background:#d4af37;border:2px solid #111;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 12px #d4af37"></div>`,
});

type Props = {
  posicao: [number, number] | null;
  onMarcar: (lat: number, lng: number) => void;
};

/** Mapa com pino: toque no mapa ou arraste o pino para escolher o local. */
export default function MapaPino({ posicao, onMarcar }: Props) {
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const pino = useRef<L.Marker | null>(null);
  const cb = useRef(onMarcar);
  cb.current = onMarcar;

  useEffect(() => {
    if (!div.current || mapa.current) return;
    const m = L.map(div.current).setView(posicao ?? CENTRO, posicao ? 16 : 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      className: "mapa-escuro",
      maxZoom: 19,
    }).addTo(m);
    const p = L.marker(posicao ?? CENTRO, { icon: icone, draggable: true }).addTo(m);
    p.on("dragend", () => { const ll = p.getLatLng(); cb.current(ll.lat, ll.lng); });
    m.on("click", (e: L.LeafletMouseEvent) => { p.setLatLng(e.latlng); cb.current(e.latlng.lat, e.latlng.lng); });
    mapa.current = m;
    pino.current = p;
    setTimeout(() => m.invalidateSize(), 200);
    return () => { m.remove(); mapa.current = null; pino.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!posicao || !mapa.current || !pino.current) return;
    const atual = pino.current.getLatLng();
    if (Math.abs(atual.lat - posicao[0]) < 1e-6 && Math.abs(atual.lng - posicao[1]) < 1e-6) return;
    pino.current.setLatLng(posicao);
    mapa.current.setView(posicao, Math.max(mapa.current.getZoom(), 16));
  }, [posicao]);

  return <div ref={div} className="size-full" />;
}
