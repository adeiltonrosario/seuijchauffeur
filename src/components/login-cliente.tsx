import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

/** Entrada do cliente com e-mail e senha (criar conta e esqueci a senha). */
export function LoginCliente({ voltarPara, titulo = "Entrar para ver seus créditos" }: { voltarPara: string; titulo?: string }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    const { error } = modo === "entrar"
      ? await supabase.auth.signInWithPassword({ email, password: senha })
      : await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin + voltarPara } });
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
      <h2 className="text-xl font-semibold text-gold">{modo === "entrar" ? titulo : "Criar conta de cliente"}</h2>
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
