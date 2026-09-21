import { rotuloStatus, type StatusAgendamento } from "@/lib/dados";

const estilos: Record<StatusAgendamento, string> = {
  pendente: "bg-warning/15 text-warning border-warning/30",
  confirmado: "bg-success/15 text-success border-success/30",
  "em-andamento": "bg-accent/15 text-accent border-accent/30",
  concluido: "bg-secondary text-muted-foreground border-border",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: StatusAgendamento }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${estilos[status]}`}
    >
      {rotuloStatus[status]}
    </span>
  );
}
