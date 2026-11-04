import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotaoSelecionarMapa } from "@/components/seletor-endereco-mapa";
import { BotaoFinalizarRota, type ResultadoRota } from "@/components/finalizar-rota";
import { agendarOrcamento, checarHorario, cotarModalidades } from "@/lib/orcamento.functions";
import { formatarBRL } from "@/lib/dados";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orcamento")({
  head: () => ({
    meta: [
      { title: "Orçamento e agendamento — seuchauffeur" },
      { name: "description", content: "Monte sua rota, veja o valor fechado da corrida e agende em poucos toques." },
      { property: "og:title", content: "Orçamento e agendamento — seuchauffeur" },
      { property: "og:description", content: "Consultor inteligente: rota, km contratados e valor final da corrida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Orcamento,
});

type Cotacao = { nome: string; descricao: string; valor: number };

const mascara = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

function Orcamento() {
  const checar = useServerFn(checarHorario);
  const cotar = useServerFn(cotarModalidades);
  const agendar = useServerFn(agendarOrcamento);

  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [paradas, setParadas] = useState<string[]>([]);
  const [rota, setRota] = useState<ResultadoRota | null>(null);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [escolhida, setEscolhida] = useState("");
  const [pagamento, setPagamento] = useState<"Pix" | "Cartão">("Pix");
  const [agenda, setAgenda] = useState<"livre" | "conflito" | "checando" | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<{ id: string; valor: number } | null>(null);

  const ida = data && hora ? `${data.split("-").reverse().join("/")} ${hora}` : "";
  const digitos = whats.replace(/\D/g, "");

  useEffect(() => {
    if (!ida) { setAgenda(null); return; }
    setAgenda("checando");
    let vivo = true;
    checar({ data: { ida } }).then((r) => vivo && setAgenda(r.conflito ? "conflito" : "livre")).catch(() => vivo && setAgenda(null));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ida]);

  // Mudou o trajeto: exige finalizar a rota de novo.
  const chave = [origem, ...paradas, destino].join("|");
  useEffect(() => { setRota(null); setCotacoes([]); setEscolhida(""); }, [chave]);

  const aoCalcular = async (r: ResultadoRota) => {
    setRota(r);
    const lista = await cotar({ data: { km: r.km } });
    setCotacoes(lista);
    setEscolhida(lista[0]?.nome ?? "");
  };

  const selecionada = cotacoes.find((c) => c.nome === escolhida);

  const concluir = async (): Promise<void> => {
    if (nome.trim().length < 3) return void toast.error("Informe seu nome completo.");
    if (digitos.length < 10) return void toast.error("Informe o WhatsApp com DDD.");
    if (!ida) return void toast.error("Escolha a data e o horário.");
    if (new Date(`${data}T${hora}`) < new Date()) return void toast.error("Escolha um horário futuro.");
    if (agenda === "conflito") return void toast.error("Horário ocupado. Escolha outro horário.");
    if (!origem.trim()) return void toast.error("Informe o endereço de embarque.");
    if (!rota || !selecionada) return void toast.error("Toque em “Finalizar rota e calcular km”.");
    setEnviando(true);
    try {
      const r = await agendar({ data: {
        nome: nome.trim(), whatsapp: digitos, ida, embarque: origem, paradas, desembarque: destino,
        km: rota.km, modalidade: selecionada.nome, pagamento,
      } });
      if (!r.ok) { toast.error(r.erro); if (r.erro.includes("horário")) setAgenda("conflito"); return; }
      setFeito({ id: r.id, valor: r.valor });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { toast.error("Não foi possível agendar agora. Tente novamente."); }
    finally { setEnviando(false); }
  };

  if (feito) {
    const msg = encodeURIComponent(
      `Olá! Sou ${nome}. Agendamento ${feito.id}: ${selecionada?.nome}, ${ida}. ${origem} → ${destino}. ${rota?.km.toLocaleString("pt-BR")} km · ${formatarBRL(feito.valor)} (${pagamento}).`,
    );
    return (
      <main className="mx-auto min-h-screen max-w-lg px-4 py-10">
        <Card className="surface-luxe glow-gold border-primary/40 p-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-primary" />
          <h1 className="font-display mt-3 text-2xl font-semibold">Agendamento recebido!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Nº {feito.id}</p>
          <div className="mt-5 space-y-1 text-left text-sm">
            <p><b>{selecionada?.nome}</b> · {ida}</p>
            <p className="text-muted-foreground">{origem} → {destino}</p>
            <p>{rota?.km.toLocaleString("pt-BR")} km contratados</p>
            <p className="text-gold text-2xl font-semibold">{formatarBRL(feito.valor)}</p>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Seu horário está reservado. Avisaremos pelo WhatsApp quando o motorista confirmar.</p>
          <Button asChild size="lg" className="mt-5 h-12 w-full">
            <a href={`https://wa.me/?text=${msg}`} target="_blank" rel="noreferrer">Abrir confirmação no WhatsApp</a>
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => window.location.reload()}>Novo orçamento</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-36 pt-6">
      <Link to="/" className="font-display text-xl font-semibold">seu<span className="text-gold">chauffeur</span></Link>

      <Card className="surface-luxe mt-4 border-border/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-semibold">Consultor inteligente de viagens</h1>
            <p className="mt-1 text-sm text-muted-foreground">Monte sua rota, veja o valor fechado e agende sua corrida.</p>
          </div>
          <Sparkles className="size-5 shrink-0 text-primary" />
        </div>

        <Secao titulo="1. Quem vai viajar?">
          <Campo id="o-nome" rotulo="Nome completo *">
            <Input id="o-nome" className="h-12 text-base" autoCapitalize="words" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
          </Campo>
          <Campo id="o-whats" rotulo="WhatsApp com DDD *">
            <Input id="o-whats" className="h-12 text-base" type="tel" inputMode="numeric" autoComplete="tel" value={whats} onChange={(e) => setWhats(mascara(e.target.value))} placeholder="(71) 98765-4321" />
          </Campo>
          <Campo id="o-data" rotulo="Data da viagem *">
            <Input id="o-data" className="h-12 text-base" type="date" min={new Date().toISOString().slice(0, 10)} value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <Campo id="o-hora" rotulo="Horário de embarque *">
            <Input id="o-hora" className="h-12 text-base" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </Campo>
          {agenda === "checando" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Verificando a agenda…</p>}
          {agenda === "livre" && <p className="flex items-center gap-2 text-sm text-gold"><CheckCircle2 className="size-4" /> Horário livre na frota</p>}
          {agenda === "conflito" && (
            <p className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              Este horário já tem agendamento na frota. Escolha um horário com pelo menos 1h30 de diferença.
            </p>
          )}
        </Secao>

        <Secao titulo="2. Trajeto">
          <Campo id="o-origem" rotulo="Origem (embarque) *">
            <div className="flex gap-2">
              <Input id="o-origem" className="h-12 text-base" value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex.: Pituba, Salvador" />
              <BotaoSelecionarMapa valor={origem} onConfirmar={setOrigem} rotulo="origem" />
            </div>
          </Campo>
          {paradas.map((p, i) => (
            <Campo key={i} id={`o-parada-${i}`} rotulo={`Parada ${i + 1}`}>
              <div className="flex gap-2">
                <Input id={`o-parada-${i}`} className="h-12 text-base" value={p} onChange={(e) => setParadas((l) => l.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Endereço da parada" />
                <BotaoSelecionarMapa valor={p} rotulo={`parada ${i + 1}`} onConfirmar={(v) => setParadas((l) => l.map((x, j) => (j === i ? v : x)))} />
                <Button type="button" variant="ghost" size="icon" aria-label="Remover parada" onClick={() => setParadas((l) => l.filter((_, j) => j !== i))}><X /></Button>
              </div>
            </Campo>
          ))}
          <Campo id="o-destino" rotulo="Destino (desembarque) *">
            <div className="flex gap-2">
              <Input id="o-destino" className="h-12 text-base" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex.: Aeroporto de Salvador" />
              <BotaoSelecionarMapa valor={destino} onConfirmar={setDestino} rotulo="destino" />
            </div>
          </Campo>
          <Button type="button" variant="secondary" size="sm" onClick={() => setParadas((l) => [...l, ""])}>
            <Plus /> Adicionar parada no caminho
          </Button>
          <BotaoFinalizarRota rotulo="Finalizar rota e calcular km" pontos={[origem, ...paradas, destino]} onCalculado={(r) => void aoCalcular(r)} />
          {rota && (
            <p className="rounded-md bg-primary/10 p-3 text-sm text-gold">
              Trajeto contratado: <b>{rota.km.toLocaleString("pt-BR")} km</b> (~{rota.minutos} min)
            </p>
          )}
        </Secao>

        {rota && (
          <Secao titulo="3. Escolha a modalidade">
            {cotacoes.map((c) => (
              <button key={c.nome} type="button" onClick={() => setEscolhida(c.nome)}
                className={cn("w-full rounded-lg border p-4 text-left transition",
                  escolhida === c.nome ? "glow-gold border-primary bg-primary/10" : "border-border/60")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{rota.km.toLocaleString("pt-BR")} km contratados</p>
                  </div>
                  <p className="text-gold shrink-0 text-lg font-semibold">{formatarBRL(c.valor)}</p>
                </div>
              </button>
            ))}
            <Label>Pagamento no embarque</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["Pix", "Cartão"] as const).map((p) => (
                <Button key={p} type="button" className="h-11" variant={pagamento === p ? "default" : "secondary"} onClick={() => setPagamento(p)}>
                  {p === "Pix" ? "Pix" : "Cartão no veículo"}
                </Button>
              ))}
            </div>
          </Secao>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <Button size="lg" className="h-14 w-full text-base" disabled={enviando || agenda === "conflito" || !selecionada} onClick={() => void concluir()}>
            {enviando ? <Loader2 className="animate-spin" /> : null}
            {selecionada ? `Concluir orçamento e agendar — ${formatarBRL(selecionada.valor)}` : "Finalize a rota para ver o valor"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 space-y-3 border-t border-border/60 pt-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
    </div>
  );
}
