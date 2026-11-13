import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  STATUS_INATIVOS, TAXA_INTERDIARIA_PADRAO, ADICIONAL_OCUPANTE_PADRAO, MAX_OCUPANTES, aplicarAdicionalOcupantes, aplicarTaxaInterdiaria, haConflito, voltaEmOutroDia, modalidadeLivre, valorFinal, valorModalidade, type ModalidadeBanco,
} from "@/lib/orcamento-livre";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function verificarAgenda(ida: string) {
  const db = await admin();
  const data = ida.slice(0, 10);
  const [{ data: corridas }, { count }] = await Promise.all([
    db.from("corridas").select("ida,status").like("ida", `${data}%`),
    db.from("motoristas").select("id", { count: "exact", head: true }).eq("status", "ativo"),
  ]);
  const ativas = (corridas ?? []).filter((c) => !STATUS_INATIVOS.includes(String(c.status))).map((c) => c.ida);
  return { conflito: haConflito(ida, ativas, count ?? 0) };
}

async function taxaInterdiaria(): Promise<number> {
  const db = await admin();
  const { data } = await db.from("credito_config").select("taxa_interdiaria_pct").limit(1).maybeSingle();
  const v = Number(data?.taxa_interdiaria_pct);
  return Number.isFinite(v) ? v : TAXA_INTERDIARIA_PADRAO;
}

async function adicionalOcupante(): Promise<number> {
  const db = await admin();
  const { data } = await db.from("credito_config").select("adicional_ocupante_pct").limit(1).maybeSingle();
  const v = Number(data?.adicional_ocupante_pct);
  return Number.isFinite(v) ? v : ADICIONAL_OCUPANTE_PADRAO;
}

const idaSchema = z.string().regex(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);

export const checarHorario = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ ida: idaSchema }).parse(i))
  .handler(async ({ data }) => verificarAgenda(data.ida));

export const cotarModalidades = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ km: z.number().positive().max(2000), interdiario: z.boolean().optional(), ocupantes: z.number().int().min(1).max(MAX_OCUPANTES).optional() }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const pct = data.interdiario ? await taxaInterdiaria() : 0;
    const occ = data.ocupantes ?? 1;
    const adic = occ > 1 ? await adicionalOcupante() : 0;
    const { data: lista } = await db.from("modalidades").select("nome,caracteristicas,por_km,por_turno,valor_turno,franquia_km");
    return ((lista ?? []) as ModalidadeBanco[])
      .filter((m) => modalidadeLivre(m.nome))
      .map((m) => ({ nome: m.nome, descricao: m.caracteristicas.split("\n")[0]!.slice(0, 120), valor: aplicarAdicionalOcupantes(aplicarTaxaInterdiaria(valorModalidade(m, data.km), pct), occ, adic), taxaPct: pct }));
  });

export const agendarOrcamento = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      nome: z.string().trim().min(3).max(120),
      whatsapp: z.string().regex(/^\d{10,11}$/),
      ida: idaSchema,
      embarque: z.string().trim().min(3).max(300),
      paradas: z.array(z.string().trim().max(300)).max(8),
      desembarque: z.string().trim().min(3).max(300),
      km: z.number().positive().max(2000),
      modalidade: z.string().min(1).max(120),
      pagamento: z.enum(["Pix", "Cartão"]),
      retorno: idaSchema.nullable(),
      ocupantes: z.array(z.string().trim().max(120)).min(1).max(MAX_OCUPANTES),
    }).parse(i))
  .handler(async ({ data }) => {
    if (!modalidadeLivre(data.modalidade)) return { ok: false as const, erro: "Modalidade não disponível." };
    const db = await admin();
    const { data: m } = await db.from("modalidades")
      .select("nome,caracteristicas,por_km,por_turno,valor_turno,franquia_km").eq("nome", data.modalidade).maybeSingle();
    if (!m) return { ok: false as const, erro: "Modalidade não encontrada." };
    if ((await verificarAgenda(data.ida)).conflito)
      return { ok: false as const, erro: "Este horário acabou de ser ocupado. Escolha outro horário." };
    if (data.retorno && (await verificarAgenda(data.retorno)).conflito)
      return { ok: false as const, erro: "O horário de volta está ocupado. Escolha outro horário." };
    const pct = voltaEmOutroDia(data.ida, data.retorno) ? await taxaInterdiaria() : 0;
    const occ = data.ocupantes.length;
    const adic = occ > 1 ? await adicionalOcupante() : 0;
    const valor = valorFinal(m as ModalidadeBanco, data.km, !!data.retorno, data.pagamento, pct, occ, adic); // valor sempre recalculado no servidor
    const id = `AG-${Date.now().toString().slice(-6)}`;
    const { error } = await db.from("corridas").insert({
      id, cliente: data.nome, cliente_email: "", cliente_whatsapp: data.whatsapp, motorista: "",
      embarque: data.embarque, parada: data.paradas.filter(Boolean).join(" → ") || null,
      desembarque: data.desembarque, ida: data.ida, retorno: data.retorno, modalidade: data.modalidade,
      pagamento: data.pagamento, valor, status: "aguardando_motorista", veiculo: "", categoria: "Sedan", capacidade: 4,
      ocupantes_lista: data.ocupantes.map((o, i) => o || (i === 0 ? data.nome : `Acompanhante ${i}`)),
    });
    if (error) { console.error("[orcamento] agendar", error.message); return { ok: false as const, erro: "Não foi possível agendar agora." }; }
    return { ok: true as const, id, valor };
  });
