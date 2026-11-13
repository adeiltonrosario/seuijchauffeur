import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatarBRL } from "@/lib/dados";
import { listarAgendamentosAdmin, excluirAgendamentosAdmin } from "@/lib/agendamentos-admin.functions";

type Linha = Awaited<ReturnType<typeof listarAgendamentosAdmin>>[number];

export function AdminAgendamentos() {
  const listar = useServerFn(listarAgendamentosAdmin);
  const excluir = useServerFn(excluirAgendamentosAdmin);
  const [lista, setLista] = useState<Linha[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try { setLista(await listar()); setSel(new Set()); }
    catch (e) { toast.error((e as Error).message); }
  }, [listar]);
  useEffect(() => { void carregar(); }, [carregar]);

  const rodar = async (args: { ids?: string[]; todos?: boolean }) => {
    setOcupado(true);
    try {
      const r = await excluir({ data: args });
      toast.success(`${r.excluidos} agendamento(s) excluído(s).`);
      await carregar();
    } catch (e) { toast.error((e as Error).message); }
    finally { setOcupado(false); }
  };

  const filtrada = lista.filter((a) =>
    `${a.id} ${a.cliente} ${a.cliente_email} ${a.modalidade} ${a.status}`.toLowerCase().includes(busca.toLowerCase()));
  const alternar = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const todosMarcados = filtrada.length > 0 && filtrada.every((a) => sel.has(a.id));

  return (
    <Card className="surface-luxe">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Agendamentos ({lista.length})</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" disabled={ocupado || sel.size === 0}
            onClick={() => window.confirm(`Excluir ${sel.size} agendamento(s) selecionado(s)?`) && void rodar({ ids: [...sel] })}>
            Excluir selecionados ({sel.size})
          </Button>
          <Button variant="destructive" disabled={ocupado || lista.length === 0}
            onClick={() => {
              const t = window.prompt(`Isso apaga TODOS os ${lista.length} agendamentos, sem volta. Digite EXCLUIR para confirmar:`);
              if (t?.trim().toUpperCase() === "EXCLUIR") void rodar({ todos: true });
              else if (t !== null) toast.error("Confirmação incorreta. Nada foi excluído.");
            }}>
            Excluir todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Buscar por código, cliente, modalidade ou status" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {filtrada.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-2"><Checkbox aria-label="Selecionar todos" checked={todosMarcados}
                    onCheckedChange={(v) => setSel(v ? new Set(filtrada.map((a) => a.id)) : new Set())} /></th>
                  <th className="p-2">Código</th><th className="p-2">Cliente</th><th className="p-2">Modalidade</th>
                  <th className="p-2">Data</th><th className="p-2">Valor</th><th className="p-2">Status</th><th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtrada.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-2"><Checkbox aria-label={`Selecionar ${a.id}`} checked={sel.has(a.id)} onCheckedChange={() => alternar(a.id)} /></td>
                    <td className="p-2 font-mono text-gold">{a.id}</td>
                    <td className="p-2">{a.cliente}<div className="text-xs text-muted-foreground">{a.motorista || "sem motorista"}</div></td>
                    <td className="p-2">{a.modalidade}</td>
                    <td className="p-2">{a.ida}</td>
                    <td className="p-2">{formatarBRL(a.valor)}</td>
                    <td className="p-2">{a.status}</td>
                    <td className="p-2">
                      <Button size="icon" variant="ghost" aria-label={`Excluir ${a.id}`} disabled={ocupado}
                        onClick={() => window.confirm(`Excluir o agendamento ${a.id} de ${a.cliente}?`) && void rodar({ ids: [a.id] })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
