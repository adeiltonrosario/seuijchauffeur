import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { emailCliente } from "@/lib/carteira-km";

export const Route = createFileRoute("/cliente/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira de quilômetros — seuchauffeur" },
      { name: "description", content: "Seu saldo de quilômetros acumulados, que nunca expiram, e o histórico de uso." },
      { property: "og:title", content: "Carteira de quilômetros — seuchauffeur" },
      { property: "og:description", content: "Saldo permanente de km e histórico de franquias e corridas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Carteira,
});

type Mov = { tipo: string; km: number; saldo_anterior: number; saldo_posterior: number; origem: string; criado_em: string };
const fmt = (n: number) => `${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
const rotulo: Record<string, string> = { franquia: "Franquia recebida", reserva: "Reservado para corrida", consumo: "Consumo", estorno: "Devolução", ajuste: "Ajuste" };

function Carteira() {
  const [email, setEmail] = useState("");
  const [dados, setDados] = useState<{ saldo: number; movimentos: Mov[] } | null>(null);

  const carregar = async (e: string) => {
    if (!e) return;
    localStorage.setItem("seuchauffeur:cliente-email", e.trim().toLowerCase());
    const { data } = await supabase.rpc("saldo_carteira_km", { _email: e });
    setDados((data as unknown as { saldo: number; movimentos: Mov[] }) ?? { saldo: 0, movimentos: [] });
  };

  useEffect(() => {
    const e = emailCliente();
    setEmail(e);
    void carregar(e);
  }, []);

  const movs = dados?.movimentos ?? [];
  const recebido = movs.filter((m) => m.km > 0).reduce((s, m) => s + Number(m.km), 0);
  const reservado = movs.filter((m) => m.tipo === "reserva").reduce((s, m) => s - Number(m.km), 0);
  const consumido = movs.filter((m) => m.tipo === "consumo").reduce((s, m) => s - Number(m.km), 0);

  return (
    <AppShell titulo="Carteira de quilômetros" descricao="Seus km acumulam e nunca vencem. Cada renovação soma ao saldo.">
      <Card className="mb-6 flex flex-wrap items-end gap-3 border-border/60 p-5">
        <div className="min-w-60 flex-1 space-y-2">
          <Label htmlFor="email">Seu e-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button onClick={() => carregar(email)}>Ver carteira</Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { t: "Disponível", v: dados?.saldo ?? 0, destaque: true },
          { t: "Reservado em corridas", v: reservado },
          { t: "Consumido", v: consumido },
          { t: "Franquias recebidas", v: recebido },
        ].map((c) => (
          <Card key={c.t} className={`border-border/60 p-5 ${c.destaque ? "surface-luxe" : ""}`}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.t}</p>
            <p className={`mt-2 font-display text-2xl ${c.destaque ? "text-gold" : ""}`}>{fmt(c.v)}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-border/60 p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg"><Wallet className="size-4 text-primary" /> Histórico</h2>
        {movs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma movimentação ainda. Os km entram aqui só depois que o pagamento do plano é aprovado.{" "}
            <Link to="/cliente/assinatura" search={{ p: "mensal", v: 12, preco: 150 }} className="text-primary underline">Ver planos</Link>
          </p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {movs.map((m, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-3">
                <div>
                  <p>{rotulo[m.tipo] ?? m.tipo}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.criado_em).toLocaleString("pt-BR")} · {m.origem}</p>
                </div>
                <div className="text-right">
                  <p className={m.km > 0 ? "text-primary" : ""}>{m.km > 0 ? "+" : ""}{fmt(m.km)}</p>
                  <p className="text-xs text-muted-foreground">Saldo: {fmt(m.saldo_posterior)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
