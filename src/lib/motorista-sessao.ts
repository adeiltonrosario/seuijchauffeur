/** Motorista logado: busca o cadastro pelo e-mail da sessão. */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MotoristaSessao = { nome: string; email: string; status: string; categoria: string } | null;

export function useMotoristaLogado() {
  const [estado, setEstado] = useState<{ carregando: boolean; motorista: MotoristaSessao }>({
    carregando: true,
    motorista: null,
  });
  useEffect(() => {
    let ativo = true;
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email;
      if (!email) { if (ativo) setEstado({ carregando: false, motorista: null }); return; }
      const { data } = await supabase
        .from("motoristas").select("nome,email,status,categoria").ilike("email", email).maybeSingle();
      if (ativo) setEstado({ carregando: false, motorista: data ?? null });
    })();
    return () => { ativo = false; };
  }, []);
  return estado;
}
