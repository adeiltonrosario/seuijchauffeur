import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Sparkles, Wand2, X } from "lucide-react";
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
const VALOR_KM = 2.5;

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
  const [paradas, setParadas] = useState<{ local: string; km: string }[]>([]);
  const [km, setKm] = useState("18");
  const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);
  const kmNum = num(km) + paradas.reduce((s, p) => s + num(p.km), 0);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<{ recomendacao: Recomendacao; plano: PlanoCalculado } | null>(null);

  const pedirRecomendacao = async () => {
    if (!origem.trim() || !destino.trim()) {
      toast.error("Informe o local de embarque e o destino.");
      return;
    }
    setCarregando(true);
    setResultado(null);
    try {
      const listaParadas = paradas.filter((p) => p.local.trim());
      const rotina = listaParadas.length
        ? `Rotina com paradas: ${[origem, ...listaParadas.map((p) => p.local), destino].join(" → ")}. Total de ${kmNum.toLocaleString("pt-BR")} km por rotina.`
        : `Distância: ${kmNum.toLocaleString("pt-BR")} km por viagem.`;
      const resposta = await consultar({
        data: { origem, destino, frequencia, necessidades: `${rotina} ${necessidades}`.slice(0, 800) },
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

      <div className="mt-4 space-y-3">
        <Label>Paradas adicionais da sua rotina</Label>
        {paradas.map((p, i) => (
          <div key={i} className="flex gap-2">
            <Input
              aria-label={`Parada ${i + 1}`}
              placeholder={`Parada ${i + 1} — ex.: escola, escritório, academia`}
              value={p.local}
              onChange={(e) => setParadas((l) => l.map((x, j) => (j === i ? { ...x, local: e.target.value } : x)))}
            />
            <Input
              aria-label={`Km da parada ${i + 1}`}
              className="w-28"
              inputMode="decimal"
              placeholder="km"
              value={p.km}
              onChange={(e) => setParadas((l) => l.map((x, j) => (j === i ? { ...x, km: e.target.value } : x)))}
            />
            <Button type="button" variant="ghost" size="icon" aria-label="Remover parada" onClick={() => setParadas((l) => l.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={() => setParadas((l) => [...l, { local: "", km: "" }])}>
          <Plus /> Adicionar parada na rotina
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor="consultor-km">{paradas.length ? "Km do trecho principal (origem → destino)" : "Distância por viagem (km)"}</Label>
        <Input id="consultor-km" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} />
        <p className="rounded-md bg-primary/10 p-2 text-sm text-gold">
          Sua rotina totaliza {kmNum.toLocaleString("pt-BR")} km por viagem · {formatarBRL(kmNum * VALOR_KM)} pela média de R$ 2,50/km.
        </p>
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
            const precoViagem = Math.round(kmNum * VALOR_KM * 100) / 100;
            const gastoMes = precoViagem * p.viagensPorMes;
            const planos = calcularTodosOsPlanos(p.viagensPorMes, precoViagem);
            const anual = planos[2]!;
            const sugerido = planos.find((x) => x.periodicidade === p.periodicidade) ?? planos[0]!;
            const economiaAno = (gastoMes - anual.valorMensalEquivalente) * 12;
            const dinamicaMes = gastoMes * 1.25;
            return (
              <>
              <div className="border-t border-border/60 pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Quanto você gasta hoje</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {kmNum.toLocaleString("pt-BR")} km × {formatarBRL(VALOR_KM)}/km = {formatarBRL(precoViagem)} por viagem ·{" "}
                  {p.viagensPorMes} viagens/mês ={" "}
                  <span className="font-semibold text-foreground">{formatarBRL(gastoMes)} por mês</span> pagando avulso
                  ({formatarBRL(gastoMes * 12)} por ano).
                </p>
                <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <p className="font-medium text-foreground">A ilusão da corrida barata</p>
                  <p className="mt-1 text-muted-foreground">
                    Nos apps comuns o valor muda ao longo do dia, da semana e do mês (chuva, pico, alta demanda). Uma
                    corrida de {formatarBRL(precoViagem)} vira facilmente {formatarBRL(precoViagem * 1.3)} ou mais — e
                    seu custo sobe de forma sutil para cerca de{" "}
                    <span className="font-semibold text-foreground">{formatarBRL(dinamicaMes)}/mês</span> (
                    {formatarBRL(dinamicaMes * 12)}/ano) sem você perceber.
                  </p>
                </div>
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
                        {formatarBRL(pl.valorMensalEquivalente / pl.viagensPorMes)} por viagem, valor travado
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Economia de {formatarBRL(gastoMes - pl.valorMensalEquivalente)}/mês
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 rounded-md bg-primary/10 p-2 text-sm text-gold">
                  No plano anual você economiza {formatarBRL(economiaAno)} por ano frente ao avulso — e muito mais frente
                  à tarifa dinâmica.
                </p>
              </div>

              <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
                <div className="rounded-md border border-border/60 p-3 text-sm">
                  <p className="font-medium text-muted-foreground">App comum — incerteza</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>✕ Preço que muda durante o dia, semana e mês</li>
                    <li>✕ Qualquer veículo e qualquer pessoa</li>
                    <li>✕ Carros sem climatização</li>
                    <li>✕ Sem prioridade nem compromisso</li>
                    <li>✕ Cancelamento a qualquer momento</li>
                    <li>✕ Atrasos que prejudicam sua rotina de trabalho</li>
                  </ul>
                </div>
                <div className="rounded-md border border-primary/50 bg-primary/10 p-3 text-sm">
                  <p className="font-medium text-gold">SeuChauffeur — certeza</p>
                  <ul className="mt-2 space-y-1 text-foreground">
                    <li>✓ Valor travado por viagem nos créditos</li>
                    <li>✓ Motoristas executivos homologados</li>
                    <li>✓ Frota 100% climatizada</li>
                    <li>✓ Prioridade e motorista confirmado</li>
                    <li>✓ Compromisso com seu horário</li>
                    <li>✓ Rotina previsível e sem surpresas</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano sugerido</p>
                <p className="font-display text-xl text-gold">
                  {sugerido.rotulo} · {formatarBRL(sugerido.valorMensalEquivalente)}/mês
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{resultado.recomendacao.motivoPlano}</p>
              </div>
              </>
            );
          })()}

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
