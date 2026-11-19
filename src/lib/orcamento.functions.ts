import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  STATUS_INATIVOS,
  TAXA_INTERDIARIA_PADRAO,
  ADICIONAL_OCUPANTE_PADRAO,
  MAX_OCUPANTES,
  aplicarAdicionalOcupantes,
  aplicarTaxaInterdiaria,
  haConflito,
  voltaEmOutroDia,
  modalidadeLivre,
  valorFinal,
  bloqueioTrajeto,
  ehIntermunicipal,
  ehVip,
  kmCobrados,
  valorVip,
  SUFIXO_TURNO,
  valorModalidade,
  type ModalidadeBanco,
  pedagioTotal,
} from "@/lib/orcamento-livre";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Clientes podem agendar livremente no mesmo horário; o conflito é checado por motorista no aceite.
async function verificarAgenda(_ida: string) {
  return { conflito: false };
}

export async function _verificarAgendaFrota(ida: string) {
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
  .inputValidator((i: unknown) =>
    z
      .object({
        km: z.number().positive().max(2000),
        idaVolta: z.boolean().optional(),
        enderecos: z.array(z.string().max(300)).max(10).optional(),
        interdiario: z.boolean().optional(),
        ocupantes: z.number().int().min(1).max(MAX_OCUPANTES).optional(),
        ida: idaSchema.optional(),
        retorno: idaSchema.nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const pct = data.interdiario ? await taxaInterdiaria() : 0;
    const occ = data.ocupantes ?? 1;
    const adic = occ > 1 ? await adicionalOcupante() : 0;
    const end = data.enderecos ?? [];
    const inter = ehIntermunicipal(end, data.km);
    const km = kmCobrados(data.km, !!data.idaVolta, inter);
    const pedagio = pedagioTotal(inter, data.ida ?? "", data.retorno);
    const det = (v: number) => {
      const transporte = aplicarAdicionalOcupantes(v, occ, adic);
      const total = aplicarAdicionalOcupantes(aplicarTaxaInterdiaria(v, pct), occ, adic);
      return {
        transporte,
        taxa: Math.round((total - transporte) * 100) / 100,
        pedagio,
        valor: Math.round((total + pedagio) * 100) / 100,
      };
    };
    const { data: lista } = await db
      .from("modalidades")
      .select("nome,caracteristicas,por_km,por_turno,valor_turno,franquia_km");
    const out: {
      nome: string;
      descricao: string;
      valor: number;
      transporte: number;
      taxa: number;
      pedagio: number;
      taxaPct: number;
      bloqueio: string | null;
    }[] = [];
    for (const m of ((lista ?? []) as ModalidadeBanco[]).filter((x) => modalidadeLivre(x.nome))) {
      const base = {
        descricao: m.caracteristicas.split("\n")[0]!.slice(0, 120),
        taxaPct: pct,
        bloqueio: bloqueioTrajeto(m.nome, end),
      };
      if (ehVip(m.nome)) {
        out.push({ ...base, nome: m.nome, ...det(valorVip(m, km, false)) });
        out.push({ ...base, nome: m.nome + SUFIXO_TURNO, ...det(valorVip(m, km, true)) });
      } else out.push({ ...base, nome: m.nome, ...det(valorModalidade(m, km)) });
    }
    return { intermunicipal: inter, cotacoes: out };
  });

export const agendarOrcamento = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        nome: z.string().trim().min(3).max(120),
        whatsapp: z.string().regex(/^\d{10,11}$/),
        email: z.string().trim().email().max(200),
        ida: idaSchema,
        embarque: z.string().trim().min(3).max(300),
        paradas: z.array(z.string().trim().max(300)).max(8),
        desembarque: z.string().trim().min(3).max(300),
        km: z.number().positive().max(2000),
        modalidade: z.string().min(1).max(120),
        pagamento: z.enum(["Pix", "Cartão"]),
        retorno: idaSchema.nullable(),
        ocupantes: z.array(z.string().trim().max(120)).min(1).max(MAX_OCUPANTES),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const turno = data.modalidade.endsWith(SUFIXO_TURNO);
    const nomeBase = turno ? data.modalidade.slice(0, -SUFIXO_TURNO.length) : data.modalidade;
    if (!modalidadeLivre(nomeBase)) return { ok: false as const, erro: "Modalidade não disponível." };
    const enderecos = [data.embarque, ...data.paradas, data.desembarque];
    const bloq = bloqueioTrajeto(nomeBase, enderecos);
    if (bloq) return { ok: false as const, erro: bloq };
    const db = await admin();
    const { data: m } = await db
      .from("modalidades")
      .select("nome,caracteristicas,por_km,por_turno,valor_turno,franquia_km")
      .eq("nome", nomeBase)
      .maybeSingle();
    if (!m) return { ok: false as const, erro: "Modalidade não encontrada." };
    const pct = voltaEmOutroDia(data.ida, data.retorno) ? await taxaInterdiaria() : 0;
    const occ = data.ocupantes.length;
    const adic = occ > 1 ? await adicionalOcupante() : 0;
    const inter = ehIntermunicipal(enderecos, data.km);
    const km = kmCobrados(data.km, !!data.retorno, inter);
    void valorFinal;
    void data.pagamento;
    const bruto = ehVip(nomeBase)
      ? valorVip(m as ModalidadeBanco, km, turno)
      : turno
        ? NaN
        : valorModalidade(m as ModalidadeBanco, km);
    if (!Number.isFinite(bruto)) return { ok: false as const, erro: "Modalidade não disponível." };
    const valor =
      Math.round(
        (aplicarAdicionalOcupantes(aplicarTaxaInterdiaria(bruto, pct), occ, adic) +
          pedagioTotal(inter, data.ida, data.retorno)) *
          100,
      ) / 100; // valor sempre recalculado no servidor
    const id = `AG-${Date.now().toString().slice(-6)}`;
    const { error } = await db.from("corridas").insert({
      id,
      cliente: data.nome,
      cliente_email: data.email.toLowerCase(),
      cliente_whatsapp: data.whatsapp,
      motorista: "",
      embarque: data.embarque,
      parada: data.paradas.filter(Boolean).join(" → ") || null,
      desembarque: data.desembarque,
      ida: data.ida,
      retorno: data.retorno,
      modalidade: data.modalidade,
      pagamento: data.pagamento,
      valor,
      status: "aguardando_motorista",
      veiculo: "",
      categoria: "Sedan",
      capacidade: 4,
      ocupantes_lista: data.ocupantes.map((o, i) => o || (i === 0 ? data.nome : `Acompanhante ${i}`)),
    });
    if (error) {
      console.error("[orcamento] agendar", error.message);
      return { ok: false as const, erro: "Não foi possível agendar agora." };
    }
    return { ok: true as const, id, valor };
  });

export const consultarPagamento = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().regex(/^AG-\d{6}$/), whatsapp: z.string().regex(/^\d{10,11}$/) }).parse(i),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: c } = await db
      .from("corridas")
      .select("pagamento_status")
      .eq("id", data.id)
      .eq("cliente_whatsapp", data.whatsapp)
      .maybeSingle();
    return { status: (c?.pagamento_status as string | undefined) ?? "pendente" };
  });
