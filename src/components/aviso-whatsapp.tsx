import { useEffect, useState } from "react";
import { BellRing, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Agendamento } from "@/lib/dados";
import { somenteDigitos } from "@/lib/contatos";

/** Converte "22/09/2026 07:30" em Date. */
function lerDataHora(texto: string): Date | null {
  const m = texto.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]));
}

type Tipo = "confirmacao" | "a-caminho";

function montarMensagem(a: Agendamento, tipo: Tipo) {
  const nome = a.cliente.split(" ")[0];
  if (tipo === "a-caminho") {
    return `Olá, ${nome}! O motorista ${a.motorista} já está a caminho do seu embarque (${a.embarque}).\n• Veículo: ${a.veiculo}\nChegaremos pontualmente para o seu atendimento. — SeuChauffeur`;
  }
  return `Olá, ${nome}! Sua corrida ${a.id} com a SeuChauffeur está confirmada para ${a.ida}.\n• Motorista: ${a.motorista}\n• Veículo: ${a.veiculo}\n• Embarque: ${a.embarque}\nQualquer necessidade, estamos à disposição!`;
}

function linkMensagem(telefone: string | undefined, texto: string) {
  const numero = telefone ? `55${somenteDigitos(telefone)}` : "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export function AvisoWhatsapp({ agendamento }: { agendamento: Agendamento }) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const partida = lerDataHora(agendamento.ida);
  const horas = agora && partida ? (partida.getTime() - agora) / 3_600_000 : null;
  const marco = horas === null || horas < 0 ? null : horas <= 2 ? "2h" : horas <= 24 ? "24h" : null;

  return (
    <Card className={`p-5 ${marco ? "border-primary/50 glow-gold" : "border-border/60"}`}>
      {marco ? (
        <p className="flex items-center gap-2 text-sm font-medium text-gold">
          <BellRing className="size-4" /> Hora de avisar o cliente! Faltam menos de {marco === "2h" ? "2 horas" : "24 horas"} para o embarque.
        </p>
      ) : (
        <p className="text-sm font-medium">Avisos ao cliente pelo WhatsApp</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        A mensagem abre pronta no WhatsApp — basta tocar em enviar.
        {!agendamento.whatsappCliente ? " Escolha o contato do cliente na lista." : ""}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button asChild variant={marco === "24h" ? "default" : "secondary"}>
          <a href={linkMensagem(agendamento.whatsappCliente, montarMensagem(agendamento, "confirmacao"))} target="_blank" rel="noreferrer">
            <MessageCircle /> Enviar confirmação
          </a>
        </Button>
        <Button asChild variant={marco === "2h" ? "default" : "secondary"}>
          <a href={linkMensagem(agendamento.whatsappCliente, montarMensagem(agendamento, "a-caminho"))} target="_blank" rel="noreferrer">
            <MessageCircle /> Avisar que está a caminho
          </a>
        </Button>
      </div>
    </Card>
  );
}
