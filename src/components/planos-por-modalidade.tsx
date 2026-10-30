import { CampoMoeda } from "@/components/campo-moeda";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarBRL } from "@/lib/dados";
import { DESCONTOS, MESES_DO_CICLO, rotuloPeriodicidade, type Periodicidade } from "@/lib/assinaturas";

export type PlanoModalidade = {
  id: string;
  nome: string;
  periodicidade: Periodicidade;
  kmMes: number; // créditos = km liberados por mês
  precoKm: number;
  excedenteKm: number;
  desconto: number; // %
};

const KM_PADRAO = 120;
const CHAVE = "seuchauffeur:planos-modalidade";
const PERIODOS: Periodicidade[] = ["mensal", "trimestral", "anual"];

const planosPadrao = (modalidade: string, preco: number): PlanoModalidade[] =>
  PERIODOS.map((p) => ({
    id: `${modalidade}-${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nome: `${modalidade} ${rotuloPeriodicidade[p]}`,
    periodicidade: p,
    kmMes: KM_PADRAO,
    precoKm: preco,
    excedenteKm: preco,
    desconto: DESCONTOS[p] * 100,
  }));

const calcular = (p: PlanoModalidade) => {
  const meses = MESES_DO_CICLO[p.periodicidade];
  const bruto = p.kmMes * p.precoKm * meses;
  const total = Math.round(bruto * (1 - p.desconto / 100) * 100) / 100;
  return { meses, km: p.kmMes * meses, total, mensal: Math.round((total / meses) * 100) / 100, economia: Math.round((bruto - total) * 100) / 100 };
};

export function PlanosPorModalidade({ modalidades }: { modalidades: { nome: string; valorBase: number }[] }) {
  const [planos, setPlanos] = useState<Record<string, PlanoModalidade[]>>({});
  const [carregado, setCarregado] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<PlanoModalidade | null>(null);

  const idsSalvos = useRef<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.from("planos_modalidade").select("*").order("criado_em");
      if (error) {
        toast.error("Não foi possível carregar os planos do banco.");
        try {
          setPlanos(JSON.parse(localStorage.getItem(CHAVE) ?? "{}"));
        } catch {
          setPlanos({});
        }
      } else {
        const agrupado: Record<string, PlanoModalidade[]> = {};
        for (const r of data ?? []) {
          (agrupado[r.modalidade] ??= []).push({
            id: r.id,
            nome: r.nome,
            periodicidade: r.periodicidade as Periodicidade,
            kmMes: Number(r.km_mes),
            precoKm: Number(r.preco_km),
            excedenteKm: Number(r.excedente_km),
            desconto: Number(r.desconto),
          });
          idsSalvos.current.add(r.id);
        }
        setPlanos(agrupado);
      }
      setCarregado(true);
    })();
  }, []);

  // Garante 3 planos para toda modalidade nova
  useEffect(() => {
    if (!carregado) return;
    setPlanos((atual) => {
      let mudou = false;
      const novo = { ...atual };
      for (const m of modalidades) {
        if (!novo[m.nome]) {
          novo[m.nome] = planosPadrao(m.nome, m.valorBase);
          mudou = true;
        }
      }
      return mudou ? novo : atual;
    });
  }, [modalidades, carregado]);

  // Sincroniza com o banco (somente Administrador/Gerente consegue gravar)
  useEffect(() => {
    if (!carregado) return;
    const linhas = Object.entries(planos).flatMap(([modalidade, lista]) =>
      lista.map((p) => ({
        id: p.id,
        modalidade,
        nome: p.nome,
        periodicidade: p.periodicidade,
        km_mes: p.kmMes,
        preco_km: p.precoKm,
        excedente_km: p.excedenteKm,
        desconto: p.desconto,
      })),
    );
    const atuais = new Set(linhas.map((l) => l.id));
    const removidos = [...idsSalvos.current].filter((id) => !atuais.has(id));
    void (async () => {
      if (linhas.length) {
        const { error } = await supabase.from("planos_modalidade").upsert(linhas);
        if (error) {
          toast.error("Planos não salvos no banco: entre como Administrador ou Gerente.");
          return;
        }
      }
      if (removidos.length) await supabase.from("planos_modalidade").delete().in("id", removidos);
      idsSalvos.current = atuais;
    })();
  }, [planos, carregado]);

  const editar = (p: PlanoModalidade) => {
    setEditando(p.id);
    setRascunho({ ...p });
  };

  const salvar = (modalidade: string) => {
    if (!rascunho) return;
    if (!rascunho.nome.trim() || rascunho.kmMes < 1 || rascunho.precoKm <= 0 || rascunho.desconto < 0 || rascunho.desconto > 100) {
      toast.error("Preencha nome, km (mín. 1), preço e desconto entre 0 e 100%.");
      return;
    }
    setPlanos((a) => ({ ...a, [modalidade]: (a[modalidade] ?? []).map((p) => (p.id === rascunho.id ? rascunho : p)) }));
    setEditando(null);
    setRascunho(null);
    toast.success("Plano salvo.");
  };

  const excluir = (modalidade: string, id: string) => {
    if (!window.confirm("Excluir este plano de assinatura?")) return;
    setPlanos((a) => ({ ...a, [modalidade]: (a[modalidade] ?? []).filter((p) => p.id !== id) }));
    toast.success("Plano excluído.");
  };

  const adicionar = (modalidade: string, preco: number) => {
    const novo: PlanoModalidade = {
      id: `${modalidade}-novo-${Date.now()}`,
      nome: `${modalidade} novo plano`,
      periodicidade: "mensal",
      kmMes: KM_PADRAO,
      precoKm: preco,
      excedenteKm: preco,
      desconto: 0,
    };
    setPlanos((a) => ({ ...a, [modalidade]: [...(a[modalidade] ?? []), novo] }));
    editar(novo);
  };

  const restaurar = (modalidade: string, preco: number) => {
    if (!window.confirm("Restaurar os 3 planos padrão desta modalidade?")) return;
    setPlanos((a) => ({ ...a, [modalidade]: planosPadrao(modalidade, preco) }));
    toast.success("Planos padrão restaurados.");
  };

  return (
    <div className="mt-6 space-y-6">
      {modalidades.map((m) => (
        <Card key={m.nome} className="border-border/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Planos — <span className="text-gold">{m.nome}</span>
            </h2>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => adicionar(m.nome, m.valorBase)}>
                <Plus className="size-4" /> Novo plano
              </Button>
              <Button size="sm" variant="outline" onClick={() => restaurar(m.nome, m.valorBase)}>
                <RotateCcw className="size-4" /> Restaurar padrão
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {(planos[m.nome] ?? []).map((p) => {
              const emEdicao = editando === p.id && rascunho;
              const r = emEdicao ? rascunho : p;
              const c = calcular(r);
              return (
                <div key={p.id} className="rounded-lg border border-border/60 p-4">
                  {emEdicao ? (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input value={rascunho.nome} onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Periodicidade</Label>
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          value={rascunho.periodicidade}
                          onChange={(e) => setRascunho({ ...rascunho, periodicidade: e.target.value as Periodicidade })}
                        >
                          {PERIODOS.map((x) => (
                            <option key={x} value={x}>{rotuloPeriodicidade[x]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Km (créditos)/mês</Label>
                          <Input type="number" min={1} value={rascunho.kmMes} onChange={(e) => setRascunho({ ...rascunho, kmMes: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label className="text-xs">Desconto (%)</Label>
                          <Input type="number" min={0} max={100} value={rascunho.desconto} onChange={(e) => setRascunho({ ...rascunho, desconto: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Preço por km (R$)</Label>
                        <CampoMoeda valor={rascunho.precoKm} aoMudar={(n) => setRascunho({ ...rascunho, precoKm: n })} />
                      </div>
                      <div>
                        <Label className="text-xs">Excedente por km (R$)</Label>
                        <CampoMoeda valor={rascunho.excedenteKm} aoMudar={(n) => setRascunho({ ...rascunho, excedenteKm: n })} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{rotuloPeriodicidade[p.periodicidade]}</p>
                    </>
                  )}
                  <p className="mt-3 font-display text-xl text-gold">{formatarBRL(c.mensal)} /mês</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li>{r.kmMes} km/mês = {r.kmMes} créditos · {formatarBRL(r.precoKm)}/km</li>
                    <li className="text-primary">Libera {c.km} créditos (km) no ciclo, após pagamento aprovado</li>
                    <li>Excedente: {formatarBRL(r.excedenteKm)}/km</li>
                    <li>Desconto: {r.desconto}%</li>
                    <li>Total do ciclo ({c.meses} mês/es): {formatarBRL(c.total)}</li>
                    <li>Economia: {formatarBRL(c.economia)}</li>
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {emEdicao ? (
                      <>
                        <Button size="sm" onClick={() => salvar(m.nome)}>
                          <Save className="size-4" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditando(null); setRascunho(null); }}>
                          <X className="size-4" /> Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => editar(p)}>
                        <Pencil className="size-4" /> Editar
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => excluir(m.nome, p.id)}>
                      <Trash2 className="size-4" /> Excluir
                    </Button>
                  </div>
                </div>
              );
            })}
            {(planos[m.nome] ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum plano. Clique em "Novo plano" ou "Restaurar padrão".</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
