import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linkGoogleMapsRota, linkWaze } from "@/lib/navegacao-gps";

export function BotoesNavegacao({ origem, destino }: { origem: string; destino: string }) {
  if (!destino?.trim()) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="secondary" size="sm">
        <a href={linkGoogleMapsRota(origem ?? "", destino)} target="_blank" rel="noreferrer">
          <Navigation /> Abrir no Google Maps
        </a>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <a href={linkWaze(destino)} target="_blank" rel="noreferrer">
          <Navigation /> Navegar com Waze
        </a>
      </Button>
    </div>
  );
}
