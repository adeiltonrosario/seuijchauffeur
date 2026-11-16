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
      .select("id, cliente, cliente_email, motorista, modalidade, ida, valor, valor_original, status, pagamento_status")
      .order("criado_em", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os agendamentos.");
    return (data ?? []).map((r) => ({ ...r, valor: Number(r.valor), valor_original: r.valor_original == null ? null : Number(r.valor_original) }));
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

export const descontoAgendamentoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; valorFinal: number }) => {
    const v = Math.round(Number(d.valorFinal) * 100) / 100;
    if (typeof d.id !== "string" || d.id.length > 64 || !Number.isFinite(v) || v < 0) throw new Error("Dados inválidos.");
    return { id: d.id, valorFinal: v };
  })
  .handler(async ({ data, context }) => {
    await exigirEquipe(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin.from("corridas").select("valor, valor_original, pagamento_status").eq("id", data.id).maybeSingle();
    if (!c) throw new Error("Agendamento não encontrado.");
    if (c.pagamento_status === "aprovado") throw new Error("Pagamento já aprovado; não é possível alterar o valor.");
    const original = c.valor_original == null ? Number(c.valor) : Number(c.valor_original);
    if (data.valorFinal > original) throw new Error("O valor final não pode passar do valor original.");
    const { error } = await supabaseAdmin.from("corridas")
      .update({ valor: data.valorFinal, valor_original: original, desconto_por: context.userId })
      .eq("id", data.id);
    if (error) throw new Error("Não foi possível salvar o desconto.");
    return { valor: data.valorFinal, original };
  });

export const confirmarPagamentoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (typeof d.id !== "string" || !d.id || d.id.length > 64) throw new Error("Dados inválidos.");
    return { id: d.id };
  })
  .handler(async ({ data, context }) => {
    await exigirEquipe(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("corridas")
      .update({ pagamento_status: "aprovado", pago_em: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error("Não foi possível confirmar o pagamento.");
    return { ok: true };
  });
