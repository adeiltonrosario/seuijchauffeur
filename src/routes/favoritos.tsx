import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Star, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motoristas } from "@/lib/dados";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos e fidelização — seuchauffeur" },
      { name: "description", content: "Gerencie a fidelização entre clientes e motoristas com aceitação mútua." },
      { property: "og:title", content: "Favoritos e fidelização — seuchauffeur" },
      { property: "og:description", content: "Convites pendentes, lista de favoritos e novos convites." },
    ],
  }),
  component: Favoritos,
});

function Favoritos() {
  const [favoritos, setFavoritos] = useState(motoristas.filter((m) => m.favorito).map((m) => m.nome));
  const [convites, setConvites] = useState(["Camila Duarte", "Eduardo Lima (cliente)"]);
  const [convidado, setConvidado] = useState("");

  return (
    <AppShell titulo="Favoritos" descricao="A fidelização só é concluída quando as duas partes aceitam o convite.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-luxe border-border/60 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Lista de favoritos</h2>
          <ul className="mt-4 space-y-2">
            {favoritos.map((nome) => (
              <li key={nome} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{nome}</p>
                  <p className="text-xs text-muted-foreground">Fidelização ativa</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setFavoritos((atual) => atual.filter((n) => n !== nome));
                    toast.success(`${nome} removido dos favoritos.`);
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
            {favoritos.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum favorito ainda.
              </li>
            ) : null}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Convites pendentes</h2>
            <ul className="mt-4 space-y-2">
              {convites.map((nome) => (
                <li key={nome} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                  <p className="text-sm">{nome}</p>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setConvites((atual) => atual.filter((n) => n !== nome));
                        setFavoritos((atual) => [...atual, nome]);
                        toast.success(`Fidelização com ${nome} confirmada.`);
                      }}
                    >
                      <Check className="text-success" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConvites((atual) => atual.filter((n) => n !== nome))}
                    >
                      <X className="text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
              {convites.length === 0 ? (
                <li className="text-sm text-muted-foreground">Sem convites pendentes.</li>
              ) : null}
            </ul>
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Enviar convite</h2>
            <div className="mt-4 flex gap-2">
              <Input
                value={convidado}
                placeholder="Nome do motorista ou cliente"
                onChange={(e) => setConvidado(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (!convidado.trim()) return;
                  toast.success(`Convite enviado a ${convidado}. Aguardando aceitação.`);
                  setConvidado("");
                }}
              >
                <UserPlus /> Enviar
              </Button>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="size-3.5 text-primary" /> Favoritos recebem prioridade nos novos agendamentos.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
