/** Corridas reais gravadas no banco, ligando cliente e motorista. */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Agendamento, CategoriaVeiculo, StatusAgendamento } from "@/lib/dados";

export type NovaCorrida = Omit<Agendamento, "id" | "status" | "ocupantes" | "whatsappCliente"> & {
  clienteEmail?: string;
  clienteWhatsapp?: string;
};

type Linha = {
  id: string; cliente: string; motorista: string; embarque: string; parada: string | null;
  desembarque: string; ida: string; retorno: string | null; modalidade: string; pagamento: string;
  valor: number; status: string; veiculo: string; categoria: string; capacidade: number;
  cliente_whatsapp: string;
};

function paraAgendamento(r: Linha): Agendamento {
  return {
    id: r.id, cliente: r.cliente, motorista: r.motorista, embarque: r.embarque,
    parada: r.parada ?? undefined, desembarque: r.desembarque, ida: r.ida,
    retorno: r.retorno ?? undefined, modalidade: r.modalidade,
    pagamento: r.pagamento as Agendamento["pagamento"], valor: Number(r.valor),
    status: r.status as StatusAgendamento, veiculo: r.veiculo,
    categoria: r.categoria as CategoriaVeiculo, ocupantes: [r.cliente], capacidade: r.capacidade,
    whatsappCliente: r.cliente_whatsapp || undefined,
  };
}

export async function criarCorrida(c: NovaCorrida): Promise<string | null> {
  const id = `AG-${Date.now().toString().slice(-6)}`;
  const { error } = await supabase.from("corridas").insert({
    id, cliente: c.cliente, cliente_email: c.clienteEmail ?? "", cliente_whatsapp: c.clienteWhatsapp ?? "",
    motorista: c.motorista, embarque: c.embarque, parada: c.parada ?? null, desembarque: c.desembarque,
    ida: c.ida, retorno: c.retorno ?? null, modalidade: c.modalidade, pagamento: c.pagamento,
    valor: c.valor, status: "pendente", veiculo: c.veiculo, categoria: c.categoria, capacidade: c.capacidade,
  });
  if (error) { console.error("[corridas] criar:", error.message); return null; }
  return id;
}

export async function atualizarStatusCorrida(id: string, status: StatusAgendamento) {
  const { error } = await supabase
    .from("corridas").update({ status, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) console.error("[corridas] status:", error.message);
  return !error;
}

/** Lista corridas filtradas por cliente ou motorista, atualizando ao vivo. */
export function useCorridas(filtro: { cliente?: string; motorista?: string }) {
  const [lista, setLista] = useState<Agendamento[]>([]);
  const chave = `${filtro.cliente ?? ""}|${filtro.motorista ?? ""}`;
  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      let q = supabase.from("corridas").select("*").order("criado_em", { ascending: false });
      if (filtro.cliente) q = q.eq("cliente", filtro.cliente);
      if (filtro.motorista) q = q.eq("motorista", filtro.motorista);
      const { data } = await q;
      if (ativo) setLista(((data ?? []) as Linha[]).map(paraAgendamento));
    };
    if (filtro.cliente === "" ) { setLista([]); return; }
    void carregar();
    const canal = supabase
      .channel(`corridas-${chave}-${Math.random()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "corridas" }, () => void carregar())
      .subscribe();
    return () => { ativo = false; void supabase.removeChannel(canal); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return lista;
}
