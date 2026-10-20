import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { simularCofre, vencimentoCofre } from "@/lib/creditos";

export const Route = createFileRoute("/cliente/cofre-de-creditos")({
  head: () => ({
    meta: [
      { title: "Cofre de Créditos — seuchauffeur" },
      { name: "description", content: "Guarde créditos no Cofre e estenda a validade por 2 meses." },
      { property: "og:title", content: "Cofre de Créditos — seuchauffeur" },
      { property: "og:description", content: "Carteira de créditos com lotes, validade e Cofre protegido por login." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cofre,
});

type Dados = {
  carteira: number; cofre: number; consumido: number; expirado: number;
  lotes: { id: string; local: string; origem: string; quantidade: number; saldo: number; status: string; vence_em: string }[];
  transacoes: { tipo: string; quantidade: number; descricao: string; criado_em: string }[];
};

const data = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    const { error } = modo === "entrar"
      ? await supabase.auth.signInWithPassword({ email, password: senha })
      : await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin + "/cliente/cofre-de-creditos" } });
    setOcupado(false);
    if (error) { toast.error(error.message.includes("Invalid") ? "E-mail ou senha incorretos." : error.message); return; }
    if (modo === "criar") toast.success("Conta criada. Confirme pelo link enviado ao seu e-mail.");
  }

  async function esqueci() {
    if (!email) { toast.error("Digite seu e-mail primeiro."); return; }
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
    toast.success("Enviamos o link de redefinição de senha.");
  }

  return (
    <Card className="surface-luxe mx-auto max-w-md space-y-4 p-6">
      <h2 className="text-xl font-semibold text-gold">{modo === "entrar" ? "Entrar para ver seus créditos" : "Criar conta de cliente"}</h2>
      <form onSubmit={enviar} className="space-y-3">
        <div><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label>Senha</Label><Input type="password" required minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
        <Button className="w-full" disabled={ocupado}>{modo === "entrar" ? "Entrar" : "Criar conta"}</Button>
      </form>
      <div className="flex justify-between text-sm">
        <button type="button" className="text-gold underline" onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}>
          {modo === "entrar" ? "Criar conta" : "Já tenho conta"}
        </button>
        <button type="button" className="text-muted-foreground underline" onClick={esqueci}>Esqueci a senha</button>
      </div>
    </Card>
  );
}

function Cofre() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [pronto, setPronto] = useState(false);
  const [dados, setDados] = useState<Dados | null>(null);
  const [qtd, setQtd] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    supabase.auth.getSession().then(({ data }) => { setSessao(data.session); setPronto(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function carregar() {
    const email = sessao?.user.email;
    if (!email) return;
    await supabase.rpc("expirar_creditos", { _email: email });
    const { data, error } = await supabase.rpc("meus_creditos", { _email: email });
    if (error) { toast.error("Não foi possível carregar seus créditos."); return; }
    setDados(data as unknown as Dados);
  }
  useEffect(() => { void carregar(); }, [sessao?.user.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = Number(qtd.replace(",", "."));
  const sim = dados ? simularCofre(n, Number(dados.carteira)) : null;

  async function transferir() {
    if (!sim) return;
    const { error } = await supabase.rpc("transferir_para_cofre", { _quantidade: n });
    if (error) { toast.error(error.message); return; }
    toast.success(`${sim.cofre} créditos guardados no Cofre.`);
    setQtd("");
    void carregar();
  }

  return (
    <AppShell titulo="Cofre de Créditos" descricao="Seus créditos com validade e o Cofre, que estende a validade em 2 meses.">
      {!pronto ? null : !sessao ? <Login /> : (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Conectado como {sessao.user.email}</span>
            <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Sair</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[["Carteira", dados?.carteira], ["Cofre", dados?.cofre], ["Usados", dados?.consumido], ["Vencidos", dados?.expirado]].map(([t, v]) => (
              <Card key={t as string} className="surface-luxe p-4">
                <p className="text-sm text-muted-foreground">{t}</p>
                <p className="text-2xl font-semibold text-gold">{Number(v ?? 0).toLocaleString("pt-BR")}</p>
              </Card>
            ))}
          </div>

          <Card className="surface-luxe space-y-3 p-6">
            <h2 className="text-lg font-semibold text-gold">Enviar créditos ao Cofre</h2>
            <p className="text-sm text-muted-foreground">Taxa de 1 crédito, descontada do valor enviado. Os créditos no Cofre vencem 2 meses após o envio.</p>
            <div className="flex flex-wrap items-end gap-3">
              <div><Label>Quantidade</Label><Input inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="Ex.: 40" /></div>
              <Button disabled={!sim} onClick={transferir}>Enviar ao Cofre</Button>
            </div>
            {qtd && (sim
              ? <p className="text-sm">Fica na carteira: <b>{sim.carteira}</b> · Entra no Cofre: <b>{sim.cofre}</b> · Taxa: <b>{sim.taxa}</b> · Vence em <b>{vencimentoCofre(new Date()).toLocaleDateString("pt-BR")}</b></p>
              : <p className="text-sm text-destructive">Informe mais de 1 crédito, até o saldo da carteira.</p>)}
          </Card>

          <Card className="surface-luxe p-6">
            <h2 className="mb-3 text-lg font-semibold text-gold">Lotes de créditos</h2>
            {!dados?.lotes.length ? <p className="text-sm text-muted-foreground">Nenhum lote ainda. Os créditos entram após o pagamento do plano ser aprovado.</p> : (
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground"><tr><th>Local</th><th>Origem</th><th>Saldo</th><th>Situação</th><th>Vence em</th></tr></thead>
                <tbody>{dados.lotes.map((l) => (
                  <tr key={l.id} className="border-t border-border"><td className="capitalize">{l.local}</td><td className="capitalize">{l.origem}</td><td>{l.saldo} / {l.quantidade}</td><td className="capitalize">{l.status}</td><td>{data(l.vence_em)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </Card>

          <Card className="surface-luxe p-6">
            <h2 className="mb-3 text-lg font-semibold text-gold">Histórico</h2>
            {!dados?.transacoes.length ? <p className="text-sm text-muted-foreground">Sem movimentações.</p> : (
              <ul className="space-y-1 text-sm">{dados.transacoes.map((t, i) => (
                <li key={i} className="flex justify-between border-t border-border py-1"><span>{data(t.criado_em)} — {t.descricao || t.tipo}</span><b>{t.quantidade > 0 ? "+" : ""}{t.quantidade}</b></li>
              ))}</ul>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}
