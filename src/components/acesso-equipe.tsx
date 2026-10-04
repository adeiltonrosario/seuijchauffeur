import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Login da equipe (Administrador / Gerente corporativo). As aprovações só são aceitas pelo banco para esses papéis. */
export function AcessoEquipe({ onPapel }: { onPapel?: (papel: string | null) => void } = {}) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [usuario, setUsuario] = useState<string | null>(null);
  const [papel, setPapelState] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const setPapel = (p: string | null) => {
    setPapelState(p);
    onPapel?.(p);
  };

  const atualizar = async () => {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    setUsuario(u?.email ?? null);
    if (!u) {
      setPapel(null);
      return;
    }
    const { data: papeis } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
    setPapel(papeis?.[0]?.role ?? null);
  };

  useEffect(() => {
    void atualizar();
    const { data } = supabase.auth.onAuthStateChange(() => void atualizar());
    return () => data.subscription.unsubscribe();
  }, []);

  const entrar = async (criar: boolean) => {
    setCarregando(true);
    const { error } = criar
      ? await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: `${window.location.origin}/admin` } })
      : await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível entrar. Confira e-mail e senha.");
      return;
    }
    if (criar) toast.success("Conta criada. Confirme pelo link enviado ao seu e-mail.");
  };

  const reivindicar = async () => {
    const { data } = await supabase.rpc("reivindicar_primeiro_admin");
    if (data) toast.success("Você agora é o Administrador da plataforma.");
    else toast.error("Já existe um administrador. Peça a ele para liberar seu acesso.");
    void atualizar();
  };

  if (usuario) {
    return (
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-border/60 p-4 text-sm">
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          {usuario} — {papel === "admin" ? "Administrador" : papel === "gerente" ? "Gerente corporativo" : "sem permissão de aprovação"}
        </span>
        <div className="flex gap-2">
          {!papel ? (
            <Button size="sm" variant="secondary" onClick={reivindicar}>Tornar-me o primeiro administrador</Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => void supabase.auth.signOut()}>Sair</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-border/60 p-4">
      <p className="text-sm text-muted-foreground">
        Entre como Administrador ou Gerente corporativo. Sem login, aprovações de motoristas e veículos não são gravadas.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="eq-email">E-mail</Label>
          <Input id="eq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="eq-senha">Senha</Label>
          <Input id="eq-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <Button disabled={carregando} onClick={() => entrar(false)}>Entrar</Button>
        <Button disabled={carregando} variant="secondary" onClick={() => entrar(true)}>Criar conta</Button>
      </div>
    </Card>
  );
}
