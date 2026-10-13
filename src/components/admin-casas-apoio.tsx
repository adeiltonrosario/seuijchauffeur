import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { BotaoSelecionarMapa } from "@/components/seletor-endereco-mapa";
import { formatarBRL } from "@/lib/dados";
import type { PacienteTranslado } from "@/lib/casa-apoio";

type Casa = { id: string; nome: string; endereco: string; municipio: string; telefone: string; ativa: boolean };
type Sol = { id: string; email: string; nome: string; cargo: string; whatsapp: string; casa_nome_informado: string; casa_id: string | null; status: string };
type Pedido = { id: string; data_hora: string; casa_id: string; solicitante_email: string; ida_e_volta: boolean; ar_condicionado: boolean; pacientes: PacienteTranslado[]; categoria: string; valor: number; status: string };

export function AdminCasasApoio() {
  const [casas, setCasas] = useState<Casa[]>([]);
  const [sols, setSols] = useState<Sol[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [nova, setNova] = useState({ nome: "", endereco: "", municipio: "Salvador", telefone: "" });

  async function carregar() {
    const [c, s, p] = await Promise.all([
      supabase.from("casas_de_apoio").select("*").order("nome"),
      supabase.from("solicitantes_casa_apoio").select("*").order("criado_em", { ascending: false }),
      supabase.from("pedidos_casa_apoio").select("*").order("criado_em", { ascending: false }).limit(50),
    ]);
    setCasas((c.data as Casa[]) ?? []);
    setSols((s.data as Sol[]) ?? []);
    setPedidos((p.data as unknown as Pedido[]) ?? []);
  }
  useEffect(() => { void carregar(); }, []);

  async function criarCasa() {
    if (!nova.nome.trim() || !nova.endereco.trim()) { toast.error("Informe nome e endereço."); return; }
    const { error } = await supabase.from("casas_de_apoio").insert(nova);
    if (error) { toast.error(error.message); return; }
    setNova({ nome: "", endereco: "", municipio: "Salvador", telefone: "" });
    toast.success("Casa de Apoio cadastrada.");
    void carregar();
  }
  async function alterarCasa(c: Casa, patch: Partial<Casa>) {
    const { error } = await supabase.from("casas_de_apoio").update(patch).eq("id", c.id);
    if (error) toast.error(error.message); else void carregar();
  }
  async function excluirCasa(c: Casa) {
    if (!window.confirm(`Excluir ${c.nome}?`)) return;
    const { error } = await supabase.from("casas_de_apoio").delete().eq("id", c.id);
    if (error) toast.error("Não foi possível excluir (há pedidos vinculados). Desative a casa."); else void carregar();
  }
  async function decidir(s: Sol, status: string, casa_id = s.casa_id) {
    if (status === "aprovado" && !casa_id) { toast.error("Vincule uma Casa de Apoio antes de aprovar."); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("solicitantes_casa_apoio").update({ status, casa_id, aprovador: u.user?.email ?? null }).eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("Solicitante atualizado."); void carregar(); }
  }
  const nomeCasa = (id: string) => casas.find((c) => c.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <Card className="space-y-3 border-border/60 p-5">
        <p className="font-medium">Cadastrar Casa de Apoio</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <Input placeholder="Nome" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="Endereço completo" value={nova.endereco} onChange={(e) => setNova({ ...nova, endereco: e.target.value })} />
            <BotaoSelecionarMapa valor={nova.endereco} onConfirmar={(v) => setNova((n) => ({ ...n, endereco: v }))} rotulo="endereço da casa" />
          </div>
          <Input placeholder="Município" value={nova.municipio} onChange={(e) => setNova({ ...nova, municipio: e.target.value })} />
          <Input placeholder="Telefone" value={nova.telefone} onChange={(e) => setNova({ ...nova, telefone: e.target.value })} />
        </div>
        <Button onClick={criarCasa}>Salvar Casa de Apoio</Button>
        <div className="space-y-2">
          {casas.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 p-3 text-sm">
              <span className="flex-1"><b>{c.nome}</b> — {c.endereco}, {c.municipio} {c.ativa ? "" : "(inativa)"}</span>
              <Button size="sm" variant="outline" onClick={() => {
                const endereco = window.prompt("Novo endereço", c.endereco);
                if (endereco) void alterarCasa(c, { endereco });
              }}>Editar endereço</Button>
              <Button size="sm" variant="outline" onClick={() => alterarCasa(c, { ativa: !c.ativa })}>{c.ativa ? "Desativar" : "Ativar"}</Button>
              <Button size="sm" variant="destructive" onClick={() => excluirCasa(c)}>Excluir</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 border-border/60 p-5">
        <p className="font-medium">Solicitantes</p>
        {sols.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma solicitação.</p> : null}
        {sols.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 p-3 text-sm">
            <span className="flex-1"><b>{s.nome}</b> ({s.email}) · {s.cargo} · {s.whatsapp}<br />
              <span className="text-muted-foreground">Informou: {s.casa_nome_informado} · Status: {s.status}</span></span>
            <select className="h-8 rounded-md border border-input bg-background px-2" value={s.casa_id ?? ""} onChange={(e) => decidir(s, s.status, e.target.value || null)}>
              <option value="">Vincular casa…</option>
              {casas.filter((c) => c.ativa).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <Button size="sm" onClick={() => decidir(s, "aprovado")}>Aprovar</Button>
            <Button size="sm" variant="destructive" onClick={() => decidir(s, "bloqueado")}>Bloquear</Button>
          </div>
        ))}
      </Card>

      <Card className="space-y-3 border-border/60 p-5">
        <p className="font-medium">Manifestos de translado</p>
        {pedidos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p> : null}
        {pedidos.map((p) => (
          <div key={p.id} className="rounded-md border border-border/60 p-3 text-sm">
            <p><b>{nomeCasa(p.casa_id)}</b> · {p.data_hora.replace("T", " ")} · {p.ida_e_volta ? "Ida e volta" : "Somente ida"} · {p.categoria} · <span className="text-gold">{formatarBRL(Number(p.valor))}</span></p>
            {p.ar_condicionado ? <p className="text-primary">Ar-condicionado contratado: manter ligado durante todo o trajeto</p> : null}
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {p.pacientes.map((x, i) => <li key={i}>{x.paciente}{x.acompanhante ? ` + ${x.acompanhante}` : ""} → {x.hospital} ({x.municipio}){x.extensao ? " — extensão: aguarda aceite do motorista" : ""}</li>)}
            </ul>
          </div>
        ))}
      </Card>
    </div>
  );
}
