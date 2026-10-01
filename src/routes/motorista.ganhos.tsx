import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Landmark, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarBRL, motoristas } from "@/lib/dados";
import {
  PLACEHOLDER_CHAVE,
  ROTULOS_CHAVE,
  ROTULOS_CONTA,
  carregarContas,
  contaDoMotorista,
  formatarAtualizacao,
  gravarConta,
  mascararChave,
  salvarContas,
  validarConta,
  type ContaRecebimento,
  type TipoChavePix,
  type TipoConta,
} from "@/lib/recebimento";

export const Route = createFileRoute("/motorista/ganhos")({
  head: () => ({
    meta: [
      { title: "Ganhos do motorista — seuchauffeur" },
      { name: "description", content: "Veja o saldo pendente, os pagamentos liberados e solicite o saque." },
      { property: "og:title", content: "Ganhos do motorista — seuchauffeur" },
      { property: "og:description", content: "Valores liberados somente após a conclusão das corridas." },
    ],
  }),
  component: Ganhos,
});

const liberados = [
  { id: "AG-1045", cliente: "Sofia Andrade", data: "20/09/2026", valor: 140 },
  { id: "AG-1039", cliente: "Bruno Tavares", data: "18/09/2026", valor: 265 },
  { id: "AG-1031", cliente: "Helena Muniz", data: "15/09/2026", valor: 310 },
];

const pendentes = [
  { id: "AG-1042", cliente: "Adeilton Oliveira", data: "22/09/2026", valor: 320 },
  { id: "AG-1044", cliente: "Eduardo Lima", data: "24/09/2026", valor: 540 },
];

/** Motorista da sessão de demonstração. */
const MOTORISTA_SESSAO = motoristas[0]?.nome ?? "Motorista";

const TIPOS_CHAVE: TipoChavePix[] = ["cpf", "cnpj", "email", "telefone", "aleatoria"];
const TIPOS_CONTA: TipoConta[] = ["corrente", "poupanca", "pagamento"];

function Ganhos() {
  const totalLiberado = liberados.reduce((s, i) => s + i.valor, 0);
  const totalPendente = pendentes.reduce((s, i) => s + i.valor, 0);

  const [contas, setContas] = useState<ContaRecebimento[]>([]);
  const [tipoChave, setTipoChave] = useState<TipoChavePix>("cpf");
  const [chavePix, setChavePix] = useState("");
  const [titular, setTitular] = useState("");
  const [documento, setDocumento] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [tipoConta, setTipoConta] = useState<TipoConta>("corrente");

  useEffect(() => {
    const lista = carregarContas();
    setContas(lista);
    const atual = contaDoMotorista(lista, MOTORISTA_SESSAO);
    if (atual) {
      setTipoChave(atual.tipoChave);
      setChavePix(atual.chavePix);
      setTitular(atual.titular);
      setDocumento(atual.documento);
      setBanco(atual.banco);
      setAgencia(atual.agencia);
      setConta(atual.conta);
      setTipoConta(atual.tipoConta);
    }
  }, []);

  const cadastro = contaDoMotorista(contas, MOTORISTA_SESSAO);

  const salvar = () => {
    const nova: ContaRecebimento = {
      motorista: MOTORISTA_SESSAO,
      tipoChave,
      chavePix: chavePix.trim(),
      titular: titular.trim(),
      documento: documento.trim(),
      banco: banco.trim(),
      agencia: agencia.trim(),
      conta: conta.trim(),
      tipoConta,
      atualizadoEm: new Date().toISOString(),
    };
    const erro = validarConta(nova);
    if (erro) {
      toast.error(erro);
      return;
    }
    const lista = gravarConta(contas, nova);
    setContas(lista);
    salvarContas(lista);
    toast.success("Conta de recebimento salva. Seus repasses irão para esta chave Pix.");
  };

  const solicitarSaque = () => {
    if (!cadastro) {
      toast.error("Cadastre sua chave Pix antes de solicitar o saque.");
      return;
    }
    toast.success(
      `Saque de ${formatarBRL(totalLiberado)} solicitado para a chave ${mascararChave(cadastro.chavePix)}. Transferência em até 1 dia útil.`,
    );
  };

  return (
    <AppShell titulo="Ganhos" descricao="Os valores são liberados apenas após a conclusão de cada corrida.">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="surface-luxe border-border/60 p-6">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Lock className="size-3.5" /> Pendente de liberação
            </p>
            <p className="mt-2 font-display text-3xl">{formatarBRL(totalPendente)}</p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              {pendentes.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {p.id} · {p.data}
                  </span>
                  <span>{formatarBRL(p.valor)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="glow-gold border-primary/40 p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Disponível para saque</p>
            <p className="mt-2 font-display text-3xl text-primary">{formatarBRL(totalLiberado)}</p>
            {cadastro ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-success">
                <CheckCircle2 className="size-3.5" /> Pix {ROTULOS_CHAVE[cadastro.tipoChave]} ·{" "}
                {mascararChave(cadastro.chavePix)}
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Cadastre sua chave Pix abaixo para liberar o saque.
              </p>
            )}
            <Button className="mt-4 w-full" onClick={solicitarSaque}>
              <Banknote /> Solicitar saque
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                <Landmark className="size-4" /> Dados para recebimento
              </h2>
              {cadastro ? (
                <span className="text-xs text-muted-foreground">
                  Atualizado em {formatarAtualizacao(cadastro.atualizadoEm)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Os repasses das corridas concluídas são enviados por Pix para a chave cadastrada aqui, no titular{" "}
              {MOTORISTA_SESSAO}.
            </p>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label>Tipo de chave Pix</Label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS_CHAVE.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoChave(tipo)}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        tipoChave === tipo
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {ROTULOS_CHAVE[tipo]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="chave-pix">Chave Pix</Label>
                  <Input
                    id="chave-pix"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder={PLACEHOLDER_CHAVE[tipoChave]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titular">Nome completo do titular</Label>
                  <Input
                    id="titular"
                    value={titular}
                    onChange={(e) => setTitular(e.target.value)}
                    placeholder="Como está no banco"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documento">CPF ou CNPJ do titular</Label>
                  <Input
                    id="documento"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de conta</Label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS_CONTA.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoConta(tipo)}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        tipoConta === tipo
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {ROTULOS_CONTA[tipo]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="banco">Banco (opcional)</Label>
                  <Input id="banco" value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ex.: 260 Nubank" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agencia">Agência (opcional)</Label>
                  <Input id="agencia" value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="0001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conta">Conta (opcional)</Label>
                  <Input id="conta" value={conta} onChange={(e) => setConta(e.target.value)} placeholder="12345678-9" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={salvar}>
                  <ShieldCheck /> {cadastro ? "Atualizar conta de recebimento" : "Salvar conta de recebimento"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  A titularidade precisa ser do próprio motorista cadastrado.
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Pagamentos liberados</h2>
            <ul className="mt-4 divide-y divide-border/70">
              {liberados.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium">{l.cliente}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.id} · concluída em {l.data}
                    </p>
                  </div>
                  <span className="text-sm text-success">{formatarBRL(l.valor)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
