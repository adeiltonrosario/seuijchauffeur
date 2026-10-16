import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { calcularRotaTolerante, type RotaCompleta } from "@/components/finalizar-rota";
import { BotaoSelecionarMapa } from "@/components/seletor-endereco-mapa";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VEICULOS, calcularEsportivo, recomendarVeiculos, type Cobranca, type Veiculo } from "@/lib/translado-esportivo";

const MapaTrajeto = lazy(() => import("@/components/mapa-trajeto"));

export const Route = createFileRoute("/cliente/translado-esportivo")({
  head: () => ({
    meta: [
      { title: "Translado Esportivo — Clube de Futebol | seuchauffeur" },
      { name: "description", content: "Transporte executivo de delegações: atletas, comissão técnica, rota completa e motorista reserva." },
      { property: "og:title", content: "Translado Esportivo — Clube de Futebol" },
      { property: "og:description", content: "Agende ida e volta de jogos e treinos com escala, bagagens e cobrança por evento, km ou franquia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransladoEsportivo,
});

type Pessoa = { nome: string; funcao: string };
const FUNCOES = ["Atleta", "Comissão técnica", "Dirigente", "Acompanhante"];
const EVENTOS = ["Jogo", "Treino", "Aeroporto", "Hotel / Concentração"];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function TransladoEsportivo() {
  const [clube, setClube] = useState({ nome: "", categoria: "Profissional", responsavel: "", whatsapp: "" });
  const [evento, setEvento] = useState(EVENTOS[0]!);
  const [dataHora, setDataHora] = useState("");
  const [horaRetorno, setHoraRetorno] = useState("");
  const [origem, setOrigem] = useState("");
  const [paradas, setParadas] = useState<string[]>([]);
  const [destino, setDestino] = useState("");
  const [idaVolta, setIdaVolta] = useState(true);
  const [pessoas, setPessoas] = useState<Pessoa[]>([{ nome: "", funcao: "Atleta" }]);
  const [qtdSemNome, setQtdSemNome] = useState(0);
  const [bagagens, setBagagens] = useState(0);
  const [cobranca, setCobranca] = useState<Cobranca>("evento");
  const [saldoFranquia, setSaldoFranquia] = useState(0);
  const [veiculoManual, setVeiculoManual] = useState<Veiculo | "">("");
  const [backup, setBackup] = useState(true);
  const [rota, setRota] = useState<RotaCompleta | null>(null);
  const [indices, setIndices] = useState<number[]>([]);
  const [falhas, setFalhas] = useState<number[]>([]);
  const [calculando, setCalculando] = useState(false);

  const totalPassageiros = pessoas.filter((p) => p.nome.trim()).length + qtdSemNome;
  const rec = recomendarVeiculos(Math.max(1, totalPassageiros), bagagens);
  const veiculo = veiculoManual || rec.veiculo;
  const quantidade = veiculoManual ? Math.max(1, Math.ceil(Math.max(1, totalPassageiros) / VEICULOS[veiculoManual].max)) : rec.quantidade;
  const lotacaoExcedida = veiculoManual !== "" && totalPassageiros > VEICULOS[veiculoManual].max * quantidade;

  const pontos = useMemo(() => {
    const p = [origem, ...paradas, destino].map((s) => s.trim());
    if (idaVolta && origem.trim()) p.push(origem.trim());
    return p;
  }, [origem, paradas, destino, idaVolta]);

  useEffect(() => {
    if (!origem.trim() || !destino.trim()) { setRota(null); return; }
    const t = setTimeout(async () => {
      setCalculando(true);
      try {
        const r = await calcularRotaTolerante(pontos.filter(Boolean));
        setFalhas(r.falhas); setIndices(r.indices);
        if (r.rota) setRota(r.rota);
      } catch { toast.error("Serviço de rotas indisponível. Tente novamente."); }
      finally { setCalculando(false); }
    }, 1000);
    return () => clearTimeout(t);
  }, [pontos, origem, destino]);

  const km = rota?.km ?? 0;
  const calc = calcularEsportivo({ cobranca, veiculo, quantidade, km, saldoFranquiaKm: saldoFranquia });

  const pontosMapa = useMemo(() => {
    if (!rota) return [];
    const lista = pontos.filter(Boolean);
    return rota.pontos.map((c, k) => {
      const i = indices[k] ?? k;
      const ultimo = idaVolta && i === lista.length - 1;
      return {
        lat: c[0], lng: c[1],
        tipo: (i === 0 ? "origem" : ultimo ? "retorno" : "parada") as "origem" | "parada" | "retorno",
        rotulo: i === 0 ? `Saída: ${lista[0]}` : ultimo ? "Retorno à origem" : lista[i] ?? "",
      };
    });
  }, [rota, indices, pontos, idaVolta]);

  function solicitar(): void {
    if (!clube.nome.trim() || !clube.responsavel.trim() || !clube.whatsapp.trim()) { toast.error("Informe clube, responsável e WhatsApp."); return; }
    if (!dataHora || !origem.trim() || !destino.trim()) { toast.error("Informe data, horário, saída e destino."); return; }
    if (totalPassageiros < 1) { toast.error("Informe ao menos um passageiro."); return; }
    if (lotacaoExcedida) { toast.error("Lotação acima da capacidade do veículo escolhido."); return; }
    void toast.success(`Solicitação enviada: ${quantidade}× ${VEICULOS[veiculo].nome}${backup ? " com motorista reserva" : ""}. Aguarde confirmação.`);
  }

  const campo = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <AppShell titulo="Translado Esportivo — Clube de Futebol" descricao="Delegações com escala, bagagens, rota completa e motorista titular + reserva.">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="surface-luxe space-y-4 p-5">
            <h2 className="text-gold font-semibold">Clube e evento</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Clube / equipe</Label><Input value={clube.nome} onChange={(e) => setClube({ ...clube, nome: e.target.value })} /></div>
              <div><Label>Categoria</Label>
                <select className={campo} value={clube.categoria} onChange={(e) => setClube({ ...clube, categoria: e.target.value })}>
                  {["Profissional", "Sub-20", "Sub-17", "Sub-15", "Feminino", "Master"].map((c) => <option key={c}>{c}</option>)}
                </select></div>
              <div><Label>Responsável</Label><Input value={clube.responsavel} onChange={(e) => setClube({ ...clube, responsavel: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={clube.whatsapp} onChange={(e) => setClube({ ...clube, whatsapp: e.target.value })} placeholder="(71) 9...." /></div>
              <div><Label>Tipo de evento</Label>
                <select className={campo} value={evento} onChange={(e) => setEvento(e.target.value)}>{EVENTOS.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><Label>Data e horário de saída</Label><Input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} /></div>
            </div>
          </Card>

          <Card className="surface-luxe space-y-4 p-5">
            <h2 className="text-gold font-semibold">Rota (sede, CT, hotel, estádio, aeroporto)</h2>
            <div><Label>Saída</Label><div className="flex gap-2"><Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex.: CT do clube" /><BotaoSelecionarMapa valor={origem} onConfirmar={setOrigem} /></div>
              {falhas.includes(0) && <p className="mt-1 text-xs text-gold">Endereço não localizado — use o mapa.</p>}</div>
            {paradas.map((p, i) => (
              <div key={i}><Label>Parada {i + 1}</Label>
                <div className="flex gap-2">
                  <Input value={p} onChange={(e) => setParadas(paradas.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Ex.: Hotel da delegação" />
                  <BotaoSelecionarMapa valor={p} onConfirmar={(v: string) => setParadas(paradas.map((x, j) => (j === i ? v : x)))} />
                  <Button variant="ghost" size="icon" onClick={() => setParadas(paradas.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div></div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setParadas([...paradas, ""])}><Plus className="mr-1 h-4 w-4" />Adicionar parada</Button>
            <div><Label>Destino</Label><div className="flex gap-2"><Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex.: Arena Fonte Nova" /><BotaoSelecionarMapa valor={destino} onConfirmar={setDestino} /></div></div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={idaVolta} onChange={(e) => setIdaVolta(e.target.checked)} />Ida e volta</label>
              {idaVolta && <div className="flex items-center gap-2"><Label>Horário do retorno</Label><Input type="time" className="w-32" value={horaRetorno} onChange={(e) => setHoraRetorno(e.target.value)} /></div>}
            </div>
            {rota && (
              <ClientOnly fallback={<div className="h-72 rounded-lg bg-secondary/30" />}>
                <Suspense fallback={<div className="h-72 rounded-lg bg-secondary/30" />}>
                  <MapaTrajeto pontos={pontosMapa} linha={rota.linha} />
                </Suspense>
              </ClientOnly>
            )}
          </Card>

          <Card className="surface-luxe space-y-4 p-5">
            <h2 className="text-gold font-semibold">Escala da delegação</h2>
            {pessoas.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input value={p.nome} placeholder="Nome" onChange={(e) => setPessoas(pessoas.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
                <select className={campo + " max-w-48"} value={p.funcao} onChange={(e) => setPessoas(pessoas.map((x, j) => (j === i ? { ...x, funcao: e.target.value } : x)))}>
                  {FUNCOES.map((f) => <option key={f}>{f}</option>)}
                </select>
                <Button variant="ghost" size="icon" onClick={() => setPessoas(pessoas.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPessoas([...pessoas, { nome: "", funcao: "Atleta" }])}><Plus className="mr-1 h-4 w-4" />Adicionar pessoa</Button>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Passageiros sem nome na lista</Label><Input type="number" min={0} value={qtdSemNome} onChange={(e) => setQtdSemNome(Math.max(0, Number(e.target.value)))} /></div>
              <div><Label>Bolsas / volumes de equipamento</Label><Input type="number" min={0} value={bagagens} onChange={(e) => setBagagens(Math.max(0, Number(e.target.value)))} /></div>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="surface-luxe glow-gold space-y-4 p-5">
            <h2 className="text-gold font-semibold">Consultor da viagem</h2>
            <div className="text-sm space-y-1">
              <p>Passageiros: <b>{totalPassageiros}</b> · Volumes: <b>{bagagens}</b></p>
              <p>Recomendado: <b>{rec.quantidade}× {VEICULOS[rec.veiculo].nome}</b></p>
              <p>Rota: {calculando ? <Loader2 className="inline h-4 w-4 animate-spin" /> : rota ? <b>{rota.km.toFixed(1)} km · {Math.round(rota.minutos)} min</b> : "informe saída e destino"}</p>
            </div>
            <div><Label>Veículo</Label>
              <select className={campo} value={veiculoManual} onChange={(e) => setVeiculoManual(e.target.value as Veiculo | "")}>
                <option value="">Automático (recomendado)</option>
                {(Object.keys(VEICULOS) as Veiculo[]).map((v) => <option key={v} value={v}>{VEICULOS[v].nome} ({VEICULOS[v].min}–{VEICULOS[v].max})</option>)}
              </select>
              {lotacaoExcedida && <p className="mt-1 text-xs text-destructive">Lotação acima da capacidade.</p>}</div>
            <div><Label>Forma de cobrança</Label>
              <select className={campo} value={cobranca} onChange={(e) => setCobranca(e.target.value as Cobranca)}>
                <option value="evento">Valor fechado por evento</option>
                <option value="km">Por km rodado</option>
                <option value="franquia">Contrato mensal (franquia de km)</option>
              </select></div>
            {cobranca === "franquia" && <div><Label>Saldo da franquia (km)</Label><Input type="number" min={0} value={saldoFranquia} onChange={(e) => setSaldoFranquia(Math.max(0, Number(e.target.value)))} /></div>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={backup} onChange={(e) => setBackup(e.target.checked)} />Motorista reserva com check-in 45 min antes</label>
            <div className="space-y-1 border-t border-border pt-3 text-sm">
              {calc.linhas.map((l) => <div key={l.texto} className="flex justify-between gap-2"><span className="text-muted-foreground">{l.texto}</span><span>{brl(l.valor)}</span></div>)}
              <div className="flex justify-between pt-2 text-lg font-semibold"><span>Total</span><span className="text-gold">{brl(calc.total)}</span></div>
            </div>
            <Button className="w-full" onClick={solicitar}>Solicitar translado</Button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
