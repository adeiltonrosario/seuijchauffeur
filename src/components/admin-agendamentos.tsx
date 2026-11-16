import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, Percent, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatarBRL } from "@/lib/dados";
import { listarAgendamentosAdmin, excluirAgendamentosAdmin, descontoAgendamentoAdmin, confirmarPagamentoAdmin } from "@/lib/agendamentos-admin.functions";

type Linha = Awaited<ReturnType<typeof listarAgendamentosAdmin>>[number];

export function AdminAgendamentos() {
  const listar = useServerFn(listarAgendamentosAdmin);
  const excluir = useServerFn(excluirAgendamentosAdmin);
  const descontar = useServerFn(descontoAgendamentoAdmin);
  const confirmarPg = useServerFn(confirmarPagamentoAdmin);
  const confirmarPagamento = async (a: Linha) => {
    if (!window.confirm(`Confirmar o recebimento de ${formatarBRL(a.valor)} do agendamento ${a.id}?`)) return;
    setOcupado(true);
    try { await confirmarPg({ data: { id: a.id } }); toast.success("Pagamento confirmado."); await carregar(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setOcupado(false); }
  };
  const conceder = async (a: Linha) => {
    const original = a.valor_original ?? a.valor;
    const t = window.prompt(`Desconto para ${a.id} (valor original ${formatarBRL(original)}).\nDigite em % (ex: 10%) ou em reais (ex: 20,00):`);
    if (!t) return;
    const txt = t.trim().replace(/\s/g, "");
    const n = Number(txt.replace("%", "").replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return void toast.error("Valor inválido.");
    const final = Math.max(0, Math.round((txt.endsWith("%") ? original * (1 - Math.min(n, 100) / 100) : original - n) * 100) / 100);
    if (!window.confirm(`Novo valor final do cliente: ${formatarBRL(final)}. Confirmar?`)) return;
    setOcupado(true);
    try { await descontar({ data: { id: a.id, valorFinal: final } }); toast.success(`Valor ajustado para ${formatarBRL(final)}.`); await carregar(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setOcupado(false); }
  };
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
                    <td className="p-2">{formatarBRL(a.valor)}{a.valor_original != null && a.valor_original > a.valor && (
                      <div className="text-xs text-muted-foreground line-through">{formatarBRL(a.valor_original)}</div>)}</td>
                    <td className="p-2">{a.status}<div className={`text-xs ${a.pagamento_status === "aprovado" ? "text-success" : "text-warning"}`}>
                      {a.pagamento_status === "aprovado" ? "Pago" : "Pagamento pendente"}</div></td>
                    <td className="flex gap-1 p-2">
                      {a.pagamento_status !== "aprovado" && (
                        <Button size="sm" disabled={ocupado} onClick={() => void confirmarPagamento(a)}>
                          <BadgeCheck className="h-4 w-4" /> Confirmar pagamento
                        </Button>)}
                      <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => void conceder(a)}>
                        <Percent className="h-4 w-4" /> Desconto
                      </Button>
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
