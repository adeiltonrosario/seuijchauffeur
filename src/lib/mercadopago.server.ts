// Integração Mercado Pago (somente servidor). O valor sempre vem do banco, nunca do navegador.
const API = "https://api.mercadopago.com";

export type TipoPedido = "assinatura" | "saldao";

function token() {
  const t = process.env["MERCADO_PAGO_ACCESS_TOKEN"];
  if (!t) throw new Error("Mercado Pago não configurado");
  return t;
}

export async function buscarPagamento(id: string) {
  const r = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}`);
  return (await r.json()) as { id: number; status: string; transaction_amount: number; external_reference: string | null };
}

export async function criarPix(tipo: TipoPedido, id: string, origem: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const tabela = tipo === "assinatura" ? "pedidos_assinatura" : "compras_saldao";
  const { data: p } = await supabaseAdmin.from(tabela).select("id, cliente_email, valor, status").eq("id", id).maybeSingle();
  if (!p) throw new Error("Pedido não encontrado");
  if (tipo === "assinatura" && p.status !== "pendente") throw new Error("Pedido não está pendente");
  if (tipo === "saldao" && p.status !== "reservado") throw new Error("Reserva não está ativa");

  const host = new URL(origem).host;
  const webhook = host.startsWith("localhost") ? undefined : `https://${host}/api/public/mercadopago-webhook`;
  const r = await fetch(`${API}/v1/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", "X-Idempotency-Key": `${tipo}-${id}` },
    body: JSON.stringify({
      transaction_amount: Math.round(Number(p.valor) * 100) / 100,
      description: tipo === "assinatura" ? "Plano seuchauffeur" : "Créditos Saldão seuchauffeur",
      payment_method_id: "pix",
      payer: { email: p.cliente_email },
      external_reference: `${tipo}:${id}`,
      notification_url: webhook,
    }),
  });
  const j = (await r.json()) as {
    id?: number; message?: string;
    point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
  };
  if (!r.ok || !j.id) throw new Error(j.message ?? "Falha ao gerar Pix");
  await supabaseAdmin.from(tabela).update({ provedor: "mercadopago", provedor_pagamento_id: String(j.id) }).eq("id", id);
  return {
    pagamentoId: String(j.id),
    copiaECola: j.point_of_interaction?.transaction_data?.qr_code ?? "",
    qrBase64: j.point_of_interaction?.transaction_data?.qr_code_base64 ?? "",
  };
}

/** Confere o pagamento direto no Mercado Pago e libera créditos só se aprovado e com valor correto. */
export async function processarPagamento(pagamentoId: string) {
  const pg = await buscarPagamento(pagamentoId);
  const [tipo, id] = (pg.external_reference ?? "").split(":");
  if (!id || (tipo !== "assinatura" && tipo !== "saldao")) return "ignorado";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const tabela = tipo === "assinatura" ? "pedidos_assinatura" : "compras_saldao";
  const { data: p } = await supabaseAdmin.from(tabela).select("id, valor, status").eq("id", id).maybeSingle();
  if (!p) return "pedido inexistente";
  if (pg.status !== "approved") return `status ${pg.status}`;
  if (Math.abs(Number(pg.transaction_amount) - Number(p.valor)) > 0.01) return "valor divergente";

  if (tipo === "assinatura") {
    if (p.status === "pendente") {
      await supabaseAdmin.from("pedidos_assinatura").update({ status: "aprovado", provedor_pagamento_id: String(pg.id), atualizado_em: new Date().toISOString() }).eq("id", id);
    }
    await supabaseAdmin.rpc("conceder_lote_plano", { _pedido: id });
    await supabaseAdmin.rpc("conceder_franquia_pedido", { _pedido: id, _ciclo: 1 });
  } else {
    if (p.status === "reservado") {
      await supabaseAdmin.from("compras_saldao").update({ status: "aprovado", provedor_pagamento_id: String(pg.id), atualizado_em: new Date().toISOString() }).eq("id", id);
    }
    await supabaseAdmin.rpc("conceder_compra_saldao", { _compra: id });
  }
  return "ok";
}
