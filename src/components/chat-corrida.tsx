import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { mediarMensagem } from "@/lib/mediacao.functions";
import { ATALHOS, type OrigemMensagem } from "@/lib/chat-mediado";

type Props = {
  agendamentoId: string;
  origem: OrigemMensagem;
  cliente: string;
  motorista: string;
  veiculo: string;
  embarque: string;
  desembarque: string;
  modalidade: string;
};

type Mensagem = { id: string; mediado: string; hora: string };

export function ChatCorrida(props: Props) {
  const { agendamentoId, origem } = props;
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [mediando, setMediando] = useState(false);
  const fim = useRef<HTMLDivElement | null>(null);
  const mediar = useServerFn(mediarMensagem);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      const { data } = await supabase
        .from("mensagens_corrida")
        .select("id, texto_mediado, criado_em")
        .eq("corrida_id", agendamentoId)
        .order("criado_em", { ascending: true });
      if (!ativo) return;
      setMensagens(
        (data ?? []).map((m) => ({
          id: m.id,
          mediado: m.texto_mediado,
          hora: new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        })),
      );
    };
    void carregar();
    const canal = supabase
      .channel(`chat-${agendamentoId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens_corrida", filter: `corrida_id=eq.${agendamentoId}` },
        () => void carregar(),
      )
      .subscribe();
    return () => {
      ativo = false;
      void supabase.removeChannel(canal);
    };
  }, [agendamentoId]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "nearest" });
  }, [mensagens.length, mediando]);

  const enviar = async (valor: string) => {
    const bruto = valor.trim();
    if (!bruto || mediando) return;
    setMediando(true);
    setTexto("");
    try {
      await mediar({ data: { corridaId: agendamentoId, texto: bruto } });
    } catch {
      toast.error("Não foi possível repassar a mensagem agora. Verifique se você está conectado e tente novamente.");
      setTexto(bruto);
    } finally {
      setMediando(false);
    }
  };

  const outraParte = origem === "cliente" ? props.motorista : props.cliente;

  return (
    <Card className="border-border/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Chat mediado · {outraParte}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {origem === "cliente" ? props.veiculo : props.embarque}
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Mediação automática da IA
        </span>
      </div>

      <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
        {mensagens.length === 0 && !mediando ? (
          <li className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-sm text-muted-foreground">
            Nenhum comunicado ainda. Escreva abaixo: a mediação publica a mensagem oficial para as duas partes.
          </li>
        ) : null}
        {mensagens.map((m) => (
          <li key={m.id} className="rounded-lg border border-border/70 bg-secondary/50 p-3">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bot className="size-3.5 text-primary" /> Mediação SeuChauffeur · {m.hora}
            </p>
            <p className="mt-1 text-sm">{m.mediado}</p>
          </li>
        ))}
        {mediando ? (
          <li className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Mensagem em mediação...
          </li>
        ) : null}
        <div ref={fim} />
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {ATALHOS[origem].map((a) => (
          <button
            key={a}
            type="button"
            disabled={mediando}
            onClick={() => void enviar(a)}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            {a}
          </button>
        ))}
      </div>

      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="mt-3"
        rows={3}
        placeholder="Escreva seu comunicado. A IA publica a versão oficial para as duas partes."
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Sua mensagem original não é exibida à outra parte.
        </p>
        <Button disabled={mediando || !texto.trim()} onClick={() => void enviar(texto)}>
          {mediando ? <Loader2 className="animate-spin" /> : <Send />} Enviar
        </Button>
      </div>
    </Card>
  );
}
