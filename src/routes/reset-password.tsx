import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — seuchauffeur" },
      { name: "description", content: "Crie uma nova senha para acessar sua conta seuchauffeur." },
      { property: "og:title", content: "Redefinir senha — seuchauffeur" },
      { property: "og:description", content: "Defina uma nova senha de acesso com segurança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN") setPronto(true);
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setPronto(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const salvar = async () => {
    if (senha.length < 8) return void toast.error("A senha precisa ter pelo menos 8 caracteres.");
    if (!/[A-Z]/.test(senha) || !/[a-z]/.test(senha) || !/\d/.test(senha))
      return void toast.error("Use letras maiúsculas, minúsculas e números.");
    if (senha !== confirmar) return void toast.error("As senhas não conferem.");
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) return void toast.error(`Não foi possível atualizar: ${error.message}`);
    toast.success("Senha atualizada com sucesso.");
    navigate({ to: "/admin" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="surface-luxe w-full max-w-md border-border/60 p-6">
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold">
          <KeyRound className="size-5 text-gold" /> Redefinir senha
        </h1>
        {!pronto ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Abra esta página pelo link enviado ao seu e-mail. Se o link expirou, peça um novo em "Esqueci minha senha".
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="nova">Nova senha</Label>
              <Input id="nova" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="conf">Confirmar nova senha</Label>
              <Input id="conf" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
            </div>
            <Button className="w-full" disabled={salvando} onClick={salvar}>Atualizar senha</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
