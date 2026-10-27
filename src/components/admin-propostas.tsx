import { useEffect, useState } from "react";
import { Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoMoeda } from "@/components/campo-moeda";
import { supabase } from "@/integrations/supabase/client";
import { formatarBRL, modalidades } from "@/lib/dados";

type Proposta = {
  id: string; cliente_email: string; modalidade: string; periodicidade: string;
  viagens_mes: number; franquia_km: number; valor: number; status: string; criado_em: string;
};

const ROTULO: Record<string, string> = {
  enviada: "Enviada", aguardando_pagamento: "Aguardando pagamento", paga: "Paga", cancelada: "Cancelada",
};
const CICLOS: Record<string, number> = { mensal: 1, trimestral: 3, anual: 12 };

export function AdminPropostas() {
  const [lista, setLista] = useState<Proposta[]>([]);
  const [email, setEmail] = useState("");
  const [modalidade, setModalidade] = useState(modalidades[0]?.nome ?? "");
  const [periodicidade, setPeriodicidade] = useState("mensal");
  const [viagens, setViagens] = useState(12);
  const [km, setKm] = useState(200);
  const [valor, setValor] = useState(0);
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    const { data } = await supabase.from("propostas_plano").select("*").order("criado_em", { ascending: false }).limit(100);
    setLista((data ?? []) as Proposta[]);
  };
  useEffect(() => { void carregar(); }, []);

  const enviar = async () => {
    if (!email.includes("@")) return toast.error("Informe o e-mail do cliente.");
    if (km <= 0 || valor <= 0) return toast.error("Informe km e valor maiores que zero.");
    setEnviando(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("propostas_plano").insert({
      cliente_email: email.trim().toLowerCase(), modalidade, periodicidade, viagens_mes: viagens,
      franquia_km: km, ciclos: CICLOS[periodicidade] ?? 1, valor, observacao: obs || null,
      criado_por: u.user?.email ?? null,
    });
    setEnviando(false);
    if (error) return toast.error("Não foi possível enviar: " + error.message);
    toast.success("Proposta enviada ao cliente.");
    setEmail(""); setObs(""); void carregar();
  };

  const cancelar = async (id: string) => {
    const { error } = await supabase.from("propostas_plano").update({ status: "cancelada" }).eq("id", id);
    if (error) return toast.error(error.message);
    void carregar();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="surface-luxe border-border/60 p-6 space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Nova proposta</h2>
        <div className="space-y-2"><Label>E-mail do cliente</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" /></div>
        <div className="space-y-2">
          <Label>Modalidade</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
            {modalidades.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Período</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)}>
            <option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="anual">Anual</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Viagens/mês</Label><Input type="number" min={0} value={viagens} onChange={(e) => setViagens(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Franquia (km)</Label><Input type="number" min={1} value={km} onChange={(e) => setKm(Number(e.target.value))} /></div>
        </div>
        <div className="space-y-2"><Label>Valor total</Label><CampoMoeda valor={valor} aoMudar={setValor} /></div>
        <div className="space-y-2"><Label>Observação (opcional)</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        <Button className="w-full" disabled={enviando} onClick={enviar}><Send /> Enviar proposta ao cliente</Button>
      </Card>
      <Card className="border-border/60 p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Propostas enviadas</h2>
        <ul className="mt-4 divide-y divide-border/60 text-sm">
          {lista.length === 0 && <li className="py-3 text-muted-foreground">Nenhuma proposta ainda.</li>}
          {lista.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">{p.cliente_email}</p>
                <p className="text-xs text-muted-foreground">{p.modalidade} · {p.periodicidade} · {p.franquia_km} km · {formatarBRL(Number(p.valor))}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary">{ROTULO[p.status] ?? p.status}</span>
                {p.status !== "paga" && p.status !== "cancelada" && (
                  <Button size="sm" variant="secondary" onClick={() => cancelar(p.id)}><XCircle /> Cancelar</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
