import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linkGoogleAgenda } from "@/lib/google-agenda";

export function BotaoGoogleAgenda(p: { codigo: string; ida: string; embarque: string; destino: string; detalhes?: string; className?: string }) {
  const url = linkGoogleAgenda(p);
  if (!url) return null;
  return (
    <Button asChild variant="outline" className={p.className ?? "w-full"}>
      <a href={url} target="_blank" rel="noreferrer"><CalendarPlus className="mr-2 size-4" />Adicionar ao Google Agenda</a>
    </Button>
  );
}
