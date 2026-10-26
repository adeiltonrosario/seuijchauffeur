import { createFileRoute } from "@tanstack/react-router";

// O aviso do Mercado Pago não é confiável por si só: o pagamento é sempre reconsultado na API com nosso token.
export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let id = url.searchParams.get("data.id") ?? url.searchParams.get("id");
        try {
          const corpo = (await request.json()) as { type?: string; data?: { id?: string | number } };
          if (corpo?.data?.id) id = String(corpo.data.id);
        } catch { /* sem corpo */ }
        if (!id || !/^\d{1,20}$/.test(id)) return new Response("ignorado", { status: 200 });
        try {
          const { processarPagamento } = await import("@/lib/mercadopago.server");
          await processarPagamento(id);
        } catch (e) {
          console.error("webhook mercadopago", e);
          return new Response("erro", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
