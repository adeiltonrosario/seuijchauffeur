import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Painel = {
  recebido_expiracao: number; reservado: number; vendido: number; bonus: number; disponivel: number;
  movimentos: { tipo: string; quantidade: number; descricao: string; responsavel: string | null; criado_em: string }[];
};

const rotulo: Record<string, string> = {
  entrada_expiracao: "Créditos vencidos recebidos",
  reserva_oferta: "Reservado para oferta",
  liberacao_oferta: "Oferta encerrada (devolvido)",
  venda: "Vendido no Saldão",
  bonus: "Bônus concedido",
  ajuste: "Ajuste",
};

export function AdminCarteiraCreditos() {
  const [p, setP] = useState<Painel | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    const { data, error } = await supabase.rpc("painel_carteira_admin");
    if (error) { toast.error("Entre como Administrador ou Gerente para ver a carteira."); return; }
    setP(data as unknown as Painel);
  }

  async function verificar() {
    setOcupado(true);
    const { data, error } = await supabase.rpc("expirar_creditos", {});
    setOcupado(false);
    if (error) { toast.error("Não foi possível verificar os vencimentos."); return; }
    toast.success(`${data ?? 0} lote(s) vencido(s) recolhido(s).`);
    void carregar();
  }

  useEffect(() => { void carregar(); }, []);

  const cards: [string, number | undefined][] = [
    ["Disponível no estoque", p?.disponivel],
    ["Recebido de vencimentos", p?.recebido_expiracao],
    ["Reservado em ofertas", p?.reservado],
    ["Vendido", p?.vendido],
    ["Bônus concedidos", p?.bonus],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Créditos vencidos dos clientes vêm para cá automaticamente (verificação a cada hora). Este estoque não é dinheiro recebido; o histórico não pode ser alterado.
        </p>
        <Button onClick={verificar} disabled={ocupado}>Verificar vencimentos agora</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-5">
        {cards.map(([t, v]) => (
          <Card key={t} className="surface-luxe p-4">
            <p className="text-xs text-muted-foreground">{t}</p>
            <p className="mt-1 text-2xl font-semibold text-gold">{Number(v ?? 0).toLocaleString("pt-BR")}</p>
          </Card>
        ))}
      </div>
      <Card className="border-border/60 p-5">
        <h3 className="mb-3 font-display text-lg">Histórico do estoque</h3>
        {!p?.movimentos.length ? <p className="text-sm text-muted-foreground">Nenhum crédito vencido até agora.</p> : (
          <ul className="divide-y divide-border/60 text-sm">
            {p.movimentos.map((m, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                <div>
                  <p>{rotulo[m.tipo] ?? m.tipo}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.criado_em).toLocaleString("pt-BR")} · {m.descricao}</p>
                </div>
                <b className={m.quantidade > 0 ? "text-primary" : ""}>{m.quantidade > 0 ? "+" : ""}{m.quantidade}</b>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
