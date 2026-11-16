import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AGENDA_EMPRESA, FUSO_AGENDA } from "@/lib/google-agenda";

export function AgendaFrotaAdmin() {
  const src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(AGENDA_EMPRESA)}&ctz=${encodeURIComponent(FUSO_AGENDA)}&mode=WEEK`;
  return (
    <Card className="surface-luxe mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <div>
            <h2 className="font-display text-lg font-semibold">Agenda da Frota</h2>
            <p className="text-xs text-muted-foreground">{AGENDA_EMPRESA}</p>
          </div>
        </div>
        <Button asChild variant="outline"><a href="https://calendar.google.com/calendar/r" target="_blank" rel="noreferrer">Abrir Google Agenda</a></Button>
      </div>
      <iframe title="Agenda da Frota" src={src} className="mt-4 h-[480px] w-full rounded-md border border-border bg-card" />
      <p className="mt-2 text-xs text-muted-foreground">Para ver os eventos aqui, deixe a agenda pública ou entre na conta da empresa neste navegador.</p>
    </Card>
  );
}
