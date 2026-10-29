/** Agendamentos abertos: motoristas se candidatam e o cliente vincula o escolhido. */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Candidatura = {
  id: string;
  corrida_id: string;
  motorista_email: string;
  motorista_nome: string;
  veiculo: string;
  placa: string;
  categoria: string;
  status: string;
  criado_em: string;
};

const MENSAGENS: Record<string, string> = {
  ok: "Tudo certo.",
  login_necessario: "Entre na sua conta para continuar.",
  nao_motorista: "Sua conta não está cadastrada como motorista.",
  motorista_inativo: "Seu cadastro ainda não está ativo para receber corridas.",
  corrida_inexistente: "Agendamento não encontrado.",
  corrida_fechada: "Este agendamento já tem motorista vinculado.",
  sem_permissao: "Apenas o cliente do agendamento pode vincular o motorista.",
  candidatura_inexistente: "Candidatura não encontrada.",
};

export const mensagemCandidatura = (codigo: string) => MENSAGENS[codigo] ?? codigo;

export async function candidatarCorrida(corridaId: string): Promise<string> {
  const { data, error } = await supabase.rpc("candidatar_corrida", { _corrida: corridaId });
  if (error) return error.message;
  return String(data);
}

export async function vincularMotorista(candidaturaId: string): Promise<string> {
  const { data, error } = await supabase.rpc("vincular_motorista", { _candidatura: candidaturaId });
  if (error) return error.message;
  return String(data);
}

/** Candidaturas visíveis ao usuário logado (cliente dono, motorista ou equipe), ao vivo. */
export function useCandidaturas(corridaId?: string) {
  const [lista, setLista] = useState<Candidatura[]>([]);
  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      let q = supabase.from("candidaturas_corrida").select("*").order("criado_em");
      if (corridaId) q = q.eq("corrida_id", corridaId);
      const { data } = await q;
      if (ativo) setLista((data ?? []) as Candidatura[]);
    };
    void carregar();
    const canal = supabase
      .channel(`candidaturas-${corridaId ?? "todas"}-${Math.random()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "candidaturas_corrida" }, () => void carregar())
      .on("postgres_changes", { event: "*", schema: "public", table: "corridas" }, () => void carregar())
      .subscribe();
    return () => {
      ativo = false;
      void supabase.removeChannel(canal);
    };
  }, [corridaId]);
  return lista;
}

/** E-mail da sessão atual (vazio quando deslogado). */
export function useEmailSessao() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? ""));
  }, []);
  return email;
}
