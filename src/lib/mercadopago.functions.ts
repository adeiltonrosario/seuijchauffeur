import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const entrada = z.object({ tipo: z.enum(["assinatura", "saldao"]), id: z.string().uuid() });

export const gerarPixMercadoPago = createServerFn({ method: "POST" })
  .inputValidator((d) => entrada.parse(d))
  .handler(async ({ data }) => {
    const { criarPix } = await import("./mercadopago.server");
    return criarPix(data.tipo, data.id, getRequest().url);
  });

/** Consulta o Mercado Pago (para quando o aviso automático ainda não chegou). */
export const verificarPixMercadoPago = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ pagamentoId: z.string().regex(/^\d{1,20}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { processarPagamento } = await import("./mercadopago.server");
    return { resultado: await processarPagamento(data.pagamentoId) };
  });
