import { ExternalLink, MapPin } from "lucide-react";

const BROWSER_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
const CANAL = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;

type MapaLocalProps = {
  rotulo: string;
  endereco: string;
  observacao?: string;
  destaque?: "embarque" | "parada" | "desembarque";
};

const COR_PINO: Record<NonNullable<MapaLocalProps["destaque"]>, string> = {
  embarque: "0x16a34a",
  parada: "0xf59e0b",
  desembarque: "0xdc2626",
};

export function urlNavegacao(endereco: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}&travelmode=driving`;
}

function urlImagem(endereco: string, destaque: NonNullable<MapaLocalProps["destaque"]>) {
  if (!BROWSER_KEY) return null;
  const parametros = new URLSearchParams({
    center: endereco,
    zoom: "17",
    size: "440x260",
    scale: "2",
    maptype: "roadmap",
    markers: `color:${COR_PINO[destaque]}|${endereco}`,
    key: BROWSER_KEY,
  });
  if (CANAL) parametros.set("channel", CANAL);
  return `https://maps.googleapis.com/maps/api/staticmap?${parametros.toString()}`;
}

export function MapaLocal({ rotulo, endereco, observacao, destaque = "embarque" }: MapaLocalProps) {
  const imagem = urlImagem(endereco, destaque);

  return (
    <div className="grid gap-4 rounded-xl border border-border/60 bg-card/40 p-4 sm:grid-cols-[1fr_220px] sm:items-center">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
        <p className="flex items-start gap-2 text-sm font-medium leading-snug">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" /> {endereco}
        </p>
        {observacao ? <p className="text-xs text-muted-foreground">{observacao}</p> : null}
        <a
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          href={urlNavegacao(endereco)}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="size-3.5" /> Navegar no GPS
        </a>
      </div>

      <a
        className="group relative block overflow-hidden rounded-lg border border-border/60"
        href={urlNavegacao(endereco)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Abrir ${rotulo} no mapa`}
      >
        {imagem ? (
          <img
            src={imagem}
            alt={`Vista do mapa em ${endereco}`}
            width={440}
            height={260}
            loading="lazy"
            className="h-[140px] w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-[140px] items-center justify-center bg-muted/40 px-3 text-center text-xs text-muted-foreground">
            Imagem do mapa indisponível
          </div>
        )}
      </a>
    </div>
  );
}
