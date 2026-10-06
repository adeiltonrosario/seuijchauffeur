import { useEffect, useState } from "react";
import { Copy, Gift, MessageCircle, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DESCONTO_INDICADO,
  DESCONTO_POR_INDICACAO,
  MAX_INDICACOES,
  clienteAtual,
  descontoTitular,
  meuCodigo,
} from "@/lib/indicacao";

export function ClubeIndicacoes() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [info, setInfo] = useState<{ codigo: string; usos: number; indicados: string[] } | null>(null);
  const [carregando, setCarregando] = useState(false);

  const carregar = async (e: string, n: string) => {
    setCarregando(true);
    try {
      setInfo(await meuCodigo(e, n));
      localStorage.setItem("seuchauffeur:cliente-email", e.trim().toLowerCase());
    } catch {
      toast.error("Informe um e-mail válido para gerar seu código.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const c = clienteAtual();
    setEmail(c.email);
    setNome(c.nome);
    if (c.email) void carregar(c.email, c.nome);
  }, []);

  const copiar = async () => {
    if (!info) return;
    await navigator.clipboard.writeText(info.codigo);
    toast.success("Código copiado!");
  };

  const msg = info
    ? `Oi! Uso o SeuChauffeur para meus trajetos executivos. Use meu código ${info.codigo} e ganhe ${DESCONTO_INDICADO}% de desconto no seu primeiro plano.`
    : "";

  return (
    <Card className="surface-luxe border-border/60 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Meu clube de indicações</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada amigo que assinar com seu código dá +{DESCONTO_POR_INDICACAO}% de desconto na sua mensalidade (até{" "}
            {MAX_INDICACOES * DESCONTO_POR_INDICACAO}%). Seu amigo ganha {DESCONTO_INDICADO}% no primeiro plano.
          </p>
        </div>
        <Gift className="size-5 shrink-0 text-primary" />
      </div>

      {!info ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Seu e-mail de cadastro" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button disabled={carregando || !email} onClick={() => carregar(email, nome)}>
            Gerar meu código
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-primary/40 px-4 py-2 font-display text-xl tracking-widest text-gold">
              {info.codigo}
            </span>
            <Button variant="secondary" onClick={copiar}>
              <Copy /> Copiar código
            </Button>
            <Button asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
                <MessageCircle /> Convidar no WhatsApp
              </a>
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {Array.from({ length: MAX_INDICACOES }).map((_, i) => {
              const nomeAmigo = info.indicados[i];
              return (
                <div
                  key={i}
                  className={`rounded-md border p-3 text-sm ${nomeAmigo ? "border-primary/50" : "border-dashed border-border"}`}
                >
                  {nomeAmigo ? (
                    <p className="flex items-center gap-2 text-foreground">
                      <UserCheck className="size-4 text-primary" /> {nomeAmigo || "Amigo"} · +{DESCONTO_POR_INDICACAO}%
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <UserPlus className="size-4" /> Vaga disponível
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm">
            Desconto ativo na sua próxima mensalidade:{" "}
            <strong className="text-gold">{descontoTitular(info.usos)}%</strong>
            {info.usos >= MAX_INDICACOES ? " — convites esgotados (teto atingido)." : ""}
          </p>
        </div>
      )}
    </Card>
  );
}
