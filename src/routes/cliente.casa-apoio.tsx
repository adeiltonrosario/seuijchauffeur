import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { calcularRotaTolerante, type RotaCompleta } from "@/components/finalizar-rota";
import { HOSPITAIS_RMS } from "@/lib/hospitais-rms";

const MapaTrajeto = lazy(() => import("@/components/mapa-trajeto"));
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { BotaoSelecionarMapa } from "@/components/seletor-endereco-mapa";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS_PASSAGEIROS, capacidadeDaCategoria, formatarBRL } from "@/lib/dados";
import { MUNICIPIOS_RMS, TAXA_AR_CONDICIONADO, calcularTranslado, type PacienteTranslado } from "@/lib/casa-apoio";

export const Route = createFileRoute("/cliente/casa-apoio")({
  head: () => ({
    meta: [
      { title: "Translado Casas de Apoio — seuchauffeur" },
      { name: "description", content: "Solicite transporte de pacientes e acompanhantes com embarque fixo na Casa de Apoio." },
      { property: "og:title", content: "Translado Casas de Apoio — seuchauffeur" },
      { property: "og:description", content: "Transporte de pacientes com embarque institucional travado e cobrança por paciente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransladoCasaApoio,
});

type Casa = { id: string; nome: string; endereco: string; municipio: string; telefone: string };
type Acesso = { status: string; nome: string; casa: Casa | null } | null;

const novoPaciente = (municipio = "Salvador"): PacienteTranslado => ({ paciente: "", acompanhante: "", hospital: "", municipio });

function capacidade(cat: string) {
  const c = capacidadeDaCategoria(cat as never) as unknown;
  if (typeof c === "number") return c;
  if (c && typeof c === "object" && "max" in c) return Number((c as { max: number }).max);
  return 4;
}

function TransladoCasaApoio() {
  const [email, setEmail] = useState("");
  const [acesso, setAcesso] = useState<Acesso | undefined>(undefined);
  const [form, setForm] = useState({ nome: "", cargo: "", whatsapp: "", casa: "" });
  const [pacientes, setPacientes] = useState<PacienteTranslado[]>([novoPaciente()]);
  const [ar, setAr] = useState(false);
  const [idaVolta, setIdaVolta] = useState(true);
  const [dataHora, setDataHora] = useState("");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_PASSAGEIROS[0] as string);

  async function consultar(e: string) {
    if (!e.includes("@")) { setAcesso(null); return; }
    const { data } = await supabase.rpc("acesso_casa_apoio", { _email: e });
    setAcesso((data as Acesso) ?? null);
  }
  useEffect(() => {
    const e = localStorage.getItem("seuchauffeur:cliente-email") ?? "";
    setEmail(e);
    setForm((f) => ({ ...f, nome: localStorage.getItem("seuchauffeur:cliente-nome") ?? "" }));
    void consultar(e);
  }, []);

  const cap = capacidade(categoria);
  const calc = useMemo(() => calcularTranslado(pacientes, { ar, capacidade: cap }), [pacientes, ar, cap]);

  // Trajeto completo: Casa de Apoio → hospitais (sem repetir) → retorno à Casa (ida e volta)
  const origem = acesso?.casa ? `${acesso.casa.endereco}, ${acesso.casa.municipio}` : "";
  const paradas = useMemo(() => {
    const vistos = new Map<string, string[]>();
    pacientes.filter((p) => p.hospital.trim()).forEach((p) => {
      const ch = `${p.hospital.trim()}, ${p.municipio}`;
      vistos.set(ch, [...(vistos.get(ch) ?? []), p.paciente.trim() || "Paciente"]);
    });
    return [...vistos.entries()].map(([endereco, nomes]) => ({ endereco, nomes }));
  }, [pacientes]);
  const [rota, setRota] = useState<RotaCompleta | null>(null);
  const [rotaEstado, setRotaEstado] = useState<"ocioso" | "calculando" | "erro">("ocioso");
  const [falhas, setFalhas] = useState<string[]>([]);
  const [indicesOk, setIndicesOk] = useState<number[]>([]);
  const chaveRota = [origem, ...paradas.map((p) => p.endereco), idaVolta ? "iv" : "i"].join("|");
  useEffect(() => {
    if (!origem || !paradas.length) { setRota(null); setFalhas([]); setRotaEstado("ocioso"); return; }
    const t = setTimeout(async () => {
      setRotaEstado("calculando");
      try {
        const pts = [origem, ...paradas.map((p) => p.endereco), ...(idaVolta ? [origem] : [])];
        const r = await calcularRotaTolerante(pts);
        setFalhas(r.falhas.map((i) => pts[i]!));
        setIndicesOk(r.indices);
        if (r.rota) setRota(r.rota);
        setRotaEstado("ocioso");
      } catch { setRotaEstado("erro"); }
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveRota]);
  const falhou = (hospital: string, municipio: string) => falhas.includes(`${hospital.trim()}, ${municipio}`);
  const pontosMapa = useMemo(() => {
    if (!rota) return [];
    return rota.pontos.map((c, k) => {
      const i = indicesOk[k] ?? k;
      const ultimo = idaVolta && i === paradas.length + 1;
      return {
        lat: c[0], lng: c[1],
        tipo: (i === 0 ? "origem" : ultimo ? "retorno" : "parada") as "origem" | "parada" | "retorno",
        rotulo: i === 0 ? `Embarque: ${acesso?.casa?.nome}` : ultimo ? "Retorno à Casa de Apoio" : `${paradas[i - 1]?.endereco} — ${paradas[i - 1]?.nomes.join(", ")}`,
      };
    });
  }, [rota, idaVolta, paradas, acesso, indicesOk]);

  async function solicitar() {
    const e = email.trim().toLowerCase();
    const { data, error } = await supabase.rpc("solicitar_acesso_casa_apoio", { _email: e, _nome: form.nome, _cargo: form.cargo, _whatsapp: form.whatsapp, _casa: form.casa });
    if (error || data !== "ok") { toast.error(String(data ?? error?.message)); return; }
    localStorage.setItem("seuchauffeur:cliente-email", e);
    toast.success("Solicitação enviada. Aguarde a liberação do administrador.");
    void consultar(e);
  }

  async function confirmar() {
    if (!dataHora) { toast.error("Informe data e horário."); return; }
    if (calc.bloqueios.length) { toast.error(calc.bloqueios[0]!); return; }
    if (pacientes.some((p) => p.paciente.trim() && !p.hospital.trim())) { toast.error("Informe o hospital de cada paciente."); return; }
    const { data, error } = await supabase.rpc("criar_pedido_casa_apoio", {
      _email: email, _data_hora: dataHora, _ida_e_volta: idaVolta, _ar: ar,
      _pacientes: pacientes.filter((p) => p.paciente.trim()) as never, _categoria: categoria, _valor: calc.total,
    });
    if (error || data !== "ok") { toast.error(String(data ?? error?.message)); return; }
    toast.success("Translado solicitado! O manifesto foi enviado à operação.");
    setPacientes([novoPaciente(acesso?.casa?.municipio)]);
  }

  const upd = (i: number, k: keyof PacienteTranslado, v: string | boolean) =>
    setPacientes((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  return (
    <AppShell titulo="Translado Casas de Apoio" descricao="Transporte de pacientes e acompanhantes com embarque fixo na Casa de Apoio.">
      {acesso === undefined ? null : !acesso || acesso.status !== "aprovado" || !acesso.casa ? (
        <Card className="mx-auto max-w-xl border-border/60 p-6">
          <div className="flex items-center gap-2 text-primary"><Lock className="size-4" /><p className="font-medium">Modalidade restrita</p></div>
          {acesso?.status === "pendente" ? (
            <p className="mt-3 text-sm text-muted-foreground">Sua solicitação está em análise pelo administrador. Assim que for liberada, esta tela será desbloqueada.</p>
          ) : acesso?.status === "bloqueado" ? (
            <p className="mt-3 text-sm text-muted-foreground">Seu acesso foi bloqueado. Fale com o suporte.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Solicite a liberação como solicitante de uma Casa de Apoio. O administrador vincula seu e-mail à instituição.</p>
              <div><Label>E-mail</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => consultar(email)} /></div>
              <div><Label>Seu nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Cargo / setor</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
              <div><Label>Nome da Casa de Apoio</Label><Input value={form.casa} onChange={(e) => setForm({ ...form, casa: e.target.value })} /></div>
              <Button onClick={solicitar}>Solicitar liberação</Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card className="glow-gold border-primary/40 p-5">
              <p className="text-xs uppercase tracking-wider text-primary">Embarque fixo (travado)</p>
              <p className="mt-1 font-medium">{acesso.casa.nome}</p>
              <p className="text-sm text-muted-foreground">{acesso.casa.endereco} — {acesso.casa.municipio}</p>
            </Card>
            <Card className="space-y-4 border-border/60 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label>Data e horário</Label><Input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} /></div>
                <div><Label>Veículo</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                    {CATEGORIAS_PASSAGEIROS.map((c) => <option key={c}>{c}</option>)}
                  </select></div>
                <div><Label>Trajeto</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={idaVolta ? "iv" : "i"} onChange={(e) => setIdaVolta(e.target.value === "iv")}>
                    <option value="iv">Ida e volta</option><option value="i">Somente ida</option>
                  </select></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ar} onChange={(e) => setAr(e.target.checked)} /> Ar-condicionado ligado (+ {formatarBRL(TAXA_AR_CONDICIONADO)})</label>
            </Card>
            {pacientes.map((p, i) => {
              const outro = i > 0 && p.municipio !== pacientes[0]!.municipio;
              return (
                <Card key={i} className="space-y-3 border-border/60 p-5">
                  <div className="flex items-center justify-between"><p className="font-medium">Paciente {i + 1}</p>
                    {i > 0 ? <Button size="icon" variant="ghost" onClick={() => setPacientes(pacientes.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button> : null}</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label>Nome do paciente</Label><Input value={p.paciente} onChange={(e) => upd(i, "paciente", e.target.value)} /></div>
                    <div><Label>Acompanhante (opcional)</Label><Input value={p.acompanhante} onChange={(e) => upd(i, "acompanhante", e.target.value)} /></div>
                    <div><Label>Hospital / clínica</Label>
                      <div className="flex gap-2">
                        <Input list="hospitais-rms" placeholder="Ex.: HUPES, HGE, Aristides Maltez" value={p.hospital}
                          className={p.hospital.trim() && falhou(p.hospital, p.municipio) ? "border-warning" : undefined}
                          onChange={(e) => {
                            const v = e.target.value; upd(i, "hospital", v);
                            const h = HOSPITAIS_RMS.find((x) => x.nome === v);
                            if (h && MUNICIPIOS_RMS.includes(h.municipio as never)) upd(i, "municipio", h.municipio);
                          }} />
                        <BotaoSelecionarMapa valor={p.hospital} onConfirmar={(v) => upd(i, "hospital", v)} rotulo="hospital" />
                      </div>
                      {p.hospital.trim() && falhou(p.hospital, p.municipio) ? <p className="mt-1 text-xs text-warning">Endereço não localizado. Escolha um hospital da lista ou use o botão do mapa.</p> : null}
                    </div>
                    <div><Label>Município do hospital</Label>
                      <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={p.municipio} onChange={(e) => upd(i, "municipio", e.target.value)}>
                        {MUNICIPIOS_RMS.map((m) => <option key={m}>{m}</option>)}
                      </select></div>
                  </div>
                  {outro && cap <= 5 ? (
                    <label className="flex items-center gap-2 rounded-md border border-primary/40 p-3 text-sm">
                      <input type="checkbox" checked={!!p.extensao} onChange={(e) => upd(i, "extensao", e.target.checked)} />
                      Incluir como extensão opcional (o motorista decide se aceita no mesmo carro)
                    </label>
                  ) : null}
                </Card>
              );
            })}
            <datalist id="hospitais-rms">{HOSPITAIS_RMS.map((h) => <option key={h.nome} value={h.nome}>{h.municipio}</option>)}</datalist>
            <Button variant="outline" onClick={() => setPacientes([...pacientes, novoPaciente(pacientes[0]?.municipio)])}><Plus className="size-4" /> Adicionar paciente</Button>
            <Card className="space-y-3 border-primary/40 p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Trajeto completo</p>
                {rota ? <span className="text-sm text-gold">{rota.km.toLocaleString("pt-BR")} km · ~{rota.minutos} min</span> : null}
              </div>
              {!paradas.length ? <p className="text-sm text-muted-foreground">Informe o hospital de um paciente para calcular a rota.</p> : (
                <ol className="space-y-1 text-sm">
                  <li><span className="text-success">●</span> {acesso.casa.nome} (embarque)</li>
                  {paradas.map((p, i) => <li key={i}><span className="text-primary">●</span> {p.endereco} — <span className="text-muted-foreground">{p.nomes.join(", ")}</span></li>)}
                  {idaVolta ? <li><span className="text-primary">●</span> Retorno: {acesso.casa.nome}</li> : null}
                </ol>
              )}
              {rotaEstado === "calculando" ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Calculando rota…</p> : null}
              {rotaEstado === "erro" ? <p className="text-xs text-warning">Serviço de rotas indisponível no momento. Tente novamente em instantes.</p> : null}
              {falhas.length ? <p className="text-xs text-warning">{falhas.length} ponto(s) sem localização — a rota mostra os demais.</p> : null}
              {rota ? (
                <ClientOnly fallback={<div className="h-72 rounded-lg bg-secondary/30" />}>
                  <Suspense fallback={<div className="h-72 rounded-lg bg-secondary/30" />}>
                    <MapaTrajeto pontos={pontosMapa} linha={rota.linha} />
                  </Suspense>
                </ClientOnly>
              ) : null}
            </Card>
          </div>
          <Card className="h-fit space-y-3 border-border/60 p-5 lg:sticky lg:top-6">
            <p className="font-medium">Resumo</p>
            {calc.itens.map((x, i) => <div key={i} className="flex justify-between gap-2 text-sm"><span className="text-muted-foreground">{x.descricao}</span><span>{formatarBRL(x.valor)}</span></div>)}
            <div className="flex justify-between border-t border-border pt-2 font-medium"><span>Total</span><span className="text-gold">{formatarBRL(calc.total)}</span></div>
            {rota ? <p className="text-xs text-muted-foreground">Rota: {rota.km.toLocaleString("pt-BR")} km · ~{rota.minutos} min{idaVolta ? " (ida e volta)" : ""}</p> : null}
            <p className="text-xs text-muted-foreground">Ocupantes: {calc.ocupantes} de {cap} lugares</p>
            {calc.bloqueios.map((b, i) => <p key={i} className="text-xs text-destructive">{b}</p>)}
            <Button className="w-full" disabled={calc.bloqueios.length > 0} onClick={confirmar}>Confirmar translado</Button>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
