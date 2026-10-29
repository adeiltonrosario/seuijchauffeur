import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Hand } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarBRL } from "@/lib/dados";
import { useCorridas } from "@/lib/corridas";
import { candidatarCorrida, mensagemCandidatura, useCandidaturas, useEmailSessao } from "@/lib/candidaturas";

/** Painel do motorista: agendamentos abertos aguardando interesse. */
export function OportunidadesMotorista() {
  const abertas = useCorridas({ status: "aguardando_motorista" });
  const minhas = useCandidaturas();
  const email = useEmailSessao();
  const [enviando, setEnviando] = useState<string | null>(null);

  const candidatar = async (id: string) => {
    setEnviando(id);
    const r = await candidatarCorrida(id);
    setEnviando(null);
    if (r === "ok") toast.success("Interesse enviado. O cliente vai escolher entre os interessados.");
    else toast.error(mensagemCandidatura(r));
  };

  return (
    <Card className="mb-6 border-primary/30 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-gold">Agendamentos abertos</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Demonstre interesse; o cliente escolhe e vincula o motorista.
      </p>
      {abertas.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhum agendamento aberto no momento.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {abertas.map((a) => {
            const jaEnviei = minhas.some(
              (c) => c.corrida_id === a.id && email && c.motorista_email === email.toLowerCase(),
            );
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-4">
                <div className="text-sm">
                  <p className="font-medium">{a.modalidade} · {a.ida}</p>
                  <p className="text-xs text-muted-foreground">{a.embarque} → {a.desembarque}</p>
                  <p className="text-xs text-gold">{formatarBRL(a.valor)}</p>
                </div>
                <Button size="sm" disabled={jaEnviei || enviando !== null} onClick={() => void candidatar(a.id)}>
                  <Hand /> {jaEnviei ? "Interesse enviado" : enviando === a.id ? "Enviando…" : "Tenho interesse"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Lista do cliente: seus agendamentos gravados, com acesso à escolha do motorista. */
export function MeusAgendamentosCliente() {
  const email = useEmailSessao();
  if (!email) return null;
  return <ListaCliente email={email} />;
}

function ListaCliente({ email }: { email: string }) {
  const lista = useCorridas({ clienteEmail: email }).filter(
    (a) => a.status !== "concluido" && a.status !== "cancelado",
  );
  if (lista.length === 0) return null;
  return (
    <div className="mb-6 space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Meus agendamentos</h2>
      {lista.map((a) => (
        <Link key={a.id} to="/cliente/corrida/$id" params={{ id: a.id }}>
          <Card className="flex items-center justify-between gap-3 border-border/60 p-4 transition-colors hover:border-primary/40">
            <div className="text-sm">
              <p className="font-medium">{a.modalidade} · {a.ida}</p>
              <p className="text-xs text-muted-foreground">
                {a.motorista ? `Motorista ${a.motorista}` : "Escolha o motorista entre os interessados"} · {formatarBRL(a.valor)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={a.status} />
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
