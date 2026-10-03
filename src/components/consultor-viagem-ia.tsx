import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { consultarRecomendacao } from "@/lib/consultor.functions";
import { formatarBRL } from "@/lib/dados";
import {
  calcularTodosOsPlanos,
  carregarCreditos,
  gerarLotes,
  salvarCreditos,
  type PlanoCalculado,
} from "@/lib/assinaturas";

const FREQUENCIAS = ["2 viagens por mês", "1 vez por semana", "2 a 3 vezes por semana", "Todos os dias úteis"];

type Recomendacao = {
  modalidade: string;
  motivoModalidade: string;
  periodicidade: "mensal" | "trimestral" | "anual";
  motivoPlano: string;
  viagensPorMes: number;
  dicas: string[];
  resumo: string;
};

export function ConsultorViagemIA() {
  const navigate = useNavigate();
  const consultar = useServerFn(consultarRecomendacao);

  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [frequencia, setFrequencia] = useState(FREQUENCIAS[1]!);
  const [necessidades, setNecessidades] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<{ recomendacao: Recomendacao; plano: PlanoCalculado } | null>(null);

  const pedirRecomendacao = async () => {
    console.log("[consultor] clique", { origem, destino });
    if (!origem.trim() || !destino.trim()) {
      toast.error("Informe o local de embarque e o destino.");
      return;
    }
    setCarregando(true);
    setResultado(null);
    try {
      const resposta = await consultar({
        data: { origem, destino, frequencia, necessidades },
      });
      if (!resposta.ok) {
        toast.error(resposta.erro);
        return;
      }
      setResultado({ recomendacao: resposta.recomendacao, plano: resposta.plano });
    } catch {
      toast.error("Não conseguimos falar com o consultor agora. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const assinarRecomendado = () => {
    if (!resultado) return;
    const lotes = [...carregarCreditos(), ...gerarLotes(resultado.plano)];
    salvarCreditos(lotes);
    toast.success(`Plano ${resultado.plano.rotulo.toLowerCase()} contratado — ${resultado.plano.creditosTotais} créditos de viagem.`);
  };

  return (
    <Card className="surface-luxe border-border/60 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Consultor inteligente de viagens</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Conte sua rota e sua rotina que indicamos a modalidade e o plano ideais. Consulta gratuita — não usa seus
            créditos de viagem.
          </p>
        </div>
        <Sparkles className="size-5 shrink-0 text-primary" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="consultor-origem">Origem</Label>
          <Input
            id="consultor-origem"
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            placeholder="Ex.: Alphaville, Barueri"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="consultor-destino">Destino</Label>
          <Input
            id="consultor-destino"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Ex.: Aeroporto de Guarulhos"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label>Com que frequência você viaja?</Label>
        <div className="flex flex-wrap gap-2">
          {FREQUENCIAS.map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={frequencia === f ? "default" : "secondary"}
              onClick={() => setFrequencia(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor="consultor-necessidades">Necessidades da viagem</Label>
        <Textarea
          id="consultor-necessidades"
          rows={3}
          value={necessidades}
          onChange={(e) => setNecessidades(e.target.value)}
          placeholder="Ex.: preciso trabalhar no trajeto com silêncio, levo duas malas grandes e viajo com minha mãe que usa andador."
        />
      </div>

      <Button className="mt-5 w-full" onClick={pedirRecomendacao} disabled={carregando}>
        {carregando ? <Loader2 className="animate-spin" /> : <Wand2 />}
        {carregando ? "Analisando sua rotina..." : "Recomendar modalidade e plano"}
      </Button>

      {resultado ? (
        <div className="mt-6 space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Modalidade recomendada</p>
            <p className="font-display text-xl text-gold">{resultado.recomendacao.modalidade}</p>
            <p className="mt-2 text-sm text-muted-foreground">{resultado.recomendacao.motivoModalidade}</p>
          </div>

          {(() => {
            const p = resultado.plano;
            const gastoMes = p.precoMensalSemDesconto;
            const planos = calcularTodosOsPlanos(p.viagensPorMes, p.precoUnitarioAvulso);
            const anual = planos[2]!;
            const economiaAno = (gastoMes - anual.valorMensalEquivalente) * 12;
            return (
              <div className="border-t border-border/60 pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Quanto você gasta hoje</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p.viagensPorMes} viagens/mês × {formatarBRL(p.precoUnitarioAvulso)} ={" "}
                  <span className="font-semibold text-foreground">{formatarBRL(gastoMes)} por mês</span> pagando avulso
                  ({formatarBRL(gastoMes * 12)} por ano).
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {planos.map((pl) => (
                    <div
                      key={pl.periodicidade}
                      className={`rounded-md border p-3 text-sm ${pl.periodicidade === p.periodicidade ? "border-primary bg-primary/10" : "border-border/60"}`}
                    >
                      <p className="font-medium">
                        {pl.rotulo} · {Math.round(pl.percentualDesconto * 100)}% off
                      </p>
                      <p className="text-gold font-display text-lg">{formatarBRL(pl.valorMensalEquivalente)}/mês</p>
                      <p className="text-xs text-muted-foreground">
                        {formatarBRL(pl.valorMensalEquivalente / pl.viagensPorMes)} por viagem
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Economia de {formatarBRL(gastoMes - pl.valorMensalEquivalente)}/mês
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 rounded-md bg-primary/10 p-2 text-sm text-gold">
                  No plano anual você economiza {formatarBRL(economiaAno)} por ano — mais de{" "}
                  {Math.floor(economiaAno / gastoMes)} meses de viagens grátis.
                </p>
              </div>
            );
          })()}

          <div className="border-t border-border/60 pt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano sugerido</p>
            <p className="font-display text-xl text-gold">
              {resultado.plano.rotulo} · {resultado.plano.exibicaoPrincipal}
            </p>
            <p className="text-xs text-muted-foreground">
              {resultado.plano.creditosTotais} viagens no ciclo · economia de {formatarBRL(resultado.plano.economiaCiclo)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{resultado.recomendacao.motivoPlano}</p>
          </div>

          {resultado.recomendacao.dicas.length ? (
            <ul className="space-y-1 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              {resultado.recomendacao.dicas.map((d, i) => (
                <li key={i}>• {d}</li>
              ))}
            </ul>
          ) : null}

          {resultado.recomendacao.resumo ? (
            <p className="text-sm text-foreground">{resultado.recomendacao.resumo}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={assinarRecomendado}>Assinar plano {resultado.plano.rotulo.toLowerCase()}</Button>
            <Button
              variant="secondary"
              onClick={() => navigate({ to: "/cliente/agendamento/novo" })}
            >
              Agendar esta corrida
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
