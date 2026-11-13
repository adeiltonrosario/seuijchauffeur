import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function exigirEquipe(supabase: { rpc: (f: "is_staff") => PromiseLike<{ data: unknown; error: unknown }> }) {
  const { data, error } = await supabase.rpc("is_staff");
  if (error || data !== true) throw new Error("Apenas Administrador ou Gerente.");
}

export const listarAgendamentosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirEquipe(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("corridas")
      .select("id, cliente, cliente_email, motorista, modalidade, ida, valor, status")
      .order("criado_em", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os agendamentos.");
    return (data ?? []).map((r) => ({ ...r, valor: Number(r.valor) }));
  });

export const excluirAgendamentosAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids?: string[]; todos?: boolean }) => {
    if (d.todos === true) return { todos: true as const, ids: [] as string[] };
    const ids = Array.isArray(d.ids) ? d.ids.filter((i) => typeof i === "string" && i.length < 64).slice(0, 1000) : [];
    if (!ids.length) throw new Error("Nenhum agendamento selecionado.");
    return { todos: false as const, ids };
  })
  .handler(async ({ data, context }) => {
    await exigirEquipe(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = supabaseAdmin.from("corridas").delete({ count: "exact" });
    const { count, error } = data.todos ? await q.neq("id", "") : await q.in("id", data.ids);
    if (error) throw new Error("Não foi possível excluir.");
    return { excluidos: count ?? 0 };
  });
