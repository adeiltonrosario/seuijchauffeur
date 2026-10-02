import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Car, FileText, IdCard, ImagePlus, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORIAS_CARGA,
  CATEGORIAS_PASSAGEIROS,
  MAX_AJUDANTES,
  TAXA_AJUDANTE_PADRAO,
  ajudaCapacidade,
  capacidadeDaCategoria,
  capacidadeValida,
  faixaCapacidade,
  cargaDaCategoria,
  ehCategoriaCarga,
  formatarBRL,
  veiculos as veiculosFrota,
  type CategoriaVeiculo,
} from "@/lib/dados";
import { MOTORISTA_ATUAL } from "@/lib/disponibilidade";
import {
  CATEGORIAS_CNH,
  CLASSE_STATUS_VEICULO,
  ROTULO_STATUS_VEICULO,
  carregarVeiculosMotorista,
  cnhExigida,
  definirEmUso,
  solicitarVeiculo,
  validarSolicitacao,
  veiculosDoMotorista,
  type CategoriaCnh,
  type VeiculoMotorista,
} from "@/lib/veiculos-motorista";

export const Route = createFileRoute("/motorista/veiculos")({
  head: () => ({
    meta: [
      { title: "Meus veículos — seuchauffeur" },
      { name: "description", content: "Cadastre placa, cor, modelo, CRLV e CNH para autorização dos seus veículos." },
      { property: "og:title", content: "Meus veículos — seuchauffeur" },
      { property: "og:description", content: "Gerencie a frota usada nos seus agendamentos, com autorização da central." },
    ],
  }),
  component: Veiculos,
});

type Categoria = CategoriaVeiculo;

function Veiculos() {
  const [solicitacoes, setSolicitacoes] = useState<VeiculoMotorista[]>([]);
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [categoria, setCategoriaState] = useState<Categoria>("Sedan");
  const [capacidade, setCapacidade] = useState(String(capacidadeDaCategoria("Sedan")));
  const [foto, setFoto] = useState<string | null>(null);
  const [ajudantes, setAjudantes] = useState("0");
  const [valorAjudante, setValorAjudante] = useState(String(TAXA_AJUDANTE_PADRAO));

  // CRLV
  const [renavam, setRenavam] = useState("");
  const [numeroCrlv, setNumeroCrlv] = useState("");
  const [exercicioCrlv, setExercicioCrlv] = useState(String(new Date().getFullYear()));
  const [docCrlv, setDocCrlv] = useState<string | null>(null);
  // CNH
  const [cnhNumero, setCnhNumero] = useState("");
  const [cnhCategoria, setCnhCategoria] = useState<CategoriaCnh>("B");
  const [cnhValidade, setCnhValidade] = useState("");
  const [cnhEar, setCnhEar] = useState(false);
  const [docCnh, setDocCnh] = useState<string | null>(null);

  useEffect(() => {
    setSolicitacoes(carregarVeiculosMotorista());
    const atualizar = () => setSolicitacoes(carregarVeiculosMotorista());
    window.addEventListener("seuchauffeur-sync", atualizar);
    return () => window.removeEventListener("seuchauffeur-sync", atualizar);
  }, []);

  const meus = veiculosDoMotorista(solicitacoes, MOTORISTA_ATUAL);
  const aceitas = cnhExigida(categoria);

  const setCategoria = (c: Categoria) => {
    setCategoriaState(c);
    setCapacidade(String(capacidadeDaCategoria(c)));
  };

  const enviar = () => {
    if (!docCrlv || !docCnh) {
      toast.error("Anexe a foto do CRLV e da CNH para a análise da central.");
      return;
    }
    const dados = {
      motorista: MOTORISTA_ATUAL,
      placa,
      modelo,
      cor,
      categoria,
      capacidade: Number(capacidade),
      renavam,
      numeroCrlv,
      exercicioCrlv,
      cnhNumero,
      cnhCategoria,
      cnhValidade,
      cnhEar,
    };
    const erro = validarSolicitacao(dados);
    if (erro) {
      toast.error(erro);
      return;
    }
    setSolicitacoes(solicitarVeiculo(solicitacoes, dados));
    toast.success(
      `Solicitação enviada. O veículo ${placa.toUpperCase()} fica pendente até a autorização do Administrador ou Gerente corporativo.`,
    );
    setPlaca("");
    setModelo("");
    setCor("");
    setFoto(null);
    setRenavam("");
    setNumeroCrlv("");
    setCnhNumero("");
    setCnhValidade("");
    setCnhEar(false);
    setDocCrlv(null);
    setDocCnh(null);
  };

  const escalar = (id: string) => {
    setSolicitacoes(definirEmUso(solicitacoes, id));
    toast.success("Veículo escalado para operar. Sua agenda continua única, sem duas corridas no mesmo horário.");
  };

  return (
    <AppShell
      titulo="Meus veículos"
      descricao="Cada veículo adicional precisa de autorização da central, com os dados do CRLV e da CNH."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-luxe border-border/60 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Solicitar autorização de veículo
          </h2>
          <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
            O veículo só recebe corridas depois de aprovado. Sua agenda é única: corridas no mesmo horário ficam
            bloqueadas mesmo em carros diferentes.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="placa">Placa</Label>
              <Input id="placa" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC-1D23" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cor">Cor</Label>
              <Input id="cor" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Preto" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Toyota Corolla" />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {(
              [
                { titulo: "Passageiros", lista: CATEGORIAS_PASSAGEIROS },
                { titulo: "Carga (carretos e mudanças)", lista: CATEGORIAS_CARGA },
              ] as const
            ).map((grupo) => (
              <div key={grupo.titulo} className="space-y-2">
                <Label>{grupo.titulo}</Label>
                <div className="flex flex-wrap gap-2">
                  {grupo.lista.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategoria(c)}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                        categoria === c
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {faixaCapacidade(categoria).ajustavel ? (
              <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/30 p-4">
                <Label htmlFor="capacidade">
                  Ocupantes ({faixaCapacidade(categoria).min} a {faixaCapacidade(categoria).max})
                </Label>
                {categoria === "Minivan executiva" ? (
                  <div className="flex flex-wrap gap-2">
                    {[5, 6, 7].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCapacidade(String(n))}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          Number(capacidade) === n
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {n} lugares
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    id="capacidade"
                    inputMode="numeric"
                    value={capacidade}
                    onChange={(e) => setCapacidade(e.target.value)}
                    placeholder="15"
                  />
                )}
                <p className="text-xs text-muted-foreground">{ajudaCapacidade(categoria)}</p>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {categoria}:{" "}
              {faixaCapacidade(categoria).ajustavel
                ? `${capacidadeValida(categoria, Number(capacidade))} ocupantes`
                : `${capacidadeDaCategoria(categoria)} ocupantes`}
              {cargaDaCategoria(categoria) ? ` · ${cargaDaCategoria(categoria)}` : ""}
            </p>
          </div>

          <div className="mt-5 rounded-lg border border-border/60 bg-secondary/30 p-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
              <FileText className="size-3.5" /> Dados do CRLV (documento do veículo)
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="renavam">Renavam</Label>
                <Input id="renavam" inputMode="numeric" value={renavam} onChange={(e) => setRenavam(e.target.value)} placeholder="00123456789" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="num-crlv">Número do CRLV</Label>
                <Input id="num-crlv" value={numeroCrlv} onChange={(e) => setNumeroCrlv(e.target.value)} placeholder="1234567890" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exercicio">Exercício do licenciamento</Label>
                <Input id="exercicio" inputMode="numeric" value={exercicioCrlv} onChange={(e) => setExercicioCrlv(e.target.value)} placeholder="2026" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-crlv">Foto do CRLV</Label>
                <Input
                  id="doc-crlv"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setDocCrlv(e.target.files?.[0]?.name ?? null)}
                />
                {docCrlv ? <p className="text-xs text-primary">Anexado: {docCrlv}</p> : null}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
              <IdCard className="size-3.5" /> Dados da CNH
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnh-numero">Número de registro</Label>
                <Input id="cnh-numero" inputMode="numeric" value={cnhNumero} onChange={(e) => setCnhNumero(e.target.value)} placeholder="01234567890" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnh-validade">Validade</Label>
                <Input id="cnh-validade" type="date" value={cnhValidade} onChange={(e) => setCnhValidade(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Categoria (exigida para {categoria}: {aceitas.join(" ou ")})</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS_CNH.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCnhCategoria(c)}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                        cnhCategoria === c
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={cnhEar} onChange={(e) => setCnhEar(e.target.checked)} />
                Minha CNH tem a observação EAR (exerce atividade remunerada)
              </label>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="doc-cnh">Foto da CNH</Label>
                <Input
                  id="doc-cnh"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setDocCnh(e.target.files?.[0]?.name ?? null)}
                />
                {docCnh ? <p className="text-xs text-primary">Anexado: {docCnh}</p> : null}
              </div>
            </div>
          </div>

          {ehCategoriaCarga(categoria) ? (
            <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-4">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
                <Users className="size-3.5" /> Ajudantes de carga
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Referência da plataforma: {formatarBRL(TAXA_AJUDANTE_PADRAO)} por ajudante. Você define o seu valor.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ajudantes">Ajudantes disponíveis (até {MAX_AJUDANTES})</Label>
                  <Input
                    id="ajudantes"
                    inputMode="numeric"
                    value={ajudantes}
                    onChange={(e) => setAjudantes(e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor-ajudante">Valor por ajudante (R$)</Label>
                  <Input
                    id="valor-ajudante"
                    inputMode="decimal"
                    value={valorAjudante}
                    onChange={(e) => setValorAjudante(e.target.value)}
                    placeholder="80"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            <Label htmlFor="foto">Foto do veículo</Label>
            <label
              htmlFor="foto"
              className="flex h-32 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground"
            >
              {foto ? (
                <img src={foto} alt="Foto do veículo" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <span className="flex items-center gap-2">
                  <ImagePlus className="size-4" /> Enviar foto
                </span>
              )}
            </label>
            <input
              id="foto"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) setFoto(URL.createObjectURL(arquivo));
              }}
            />
          </div>

          <Button className="mt-5 w-full" onClick={enviar}>
            Enviar para autorização
          </Button>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Minhas solicitações de veículo
            </h2>
            {meus.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Você ainda não solicitou outro veículo. Preencha o formulário ao lado com os dados do CRLV e da CNH.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {meus.map((v) => (
                  <li key={v.id} className="rounded-lg border border-border/60 bg-secondary/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {v.modelo} — {v.cor}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.placa} · {v.categoria} · {v.capacidade} ocupantes
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          CRLV {v.numeroCrlv} ({v.exercicioCrlv}) · Renavam {v.renavam} · CNH {v.cnhCategoria}
                          {v.cnhEar ? " com EAR" : ""}
                        </p>
                        {v.motivo ? <p className="mt-1 text-xs text-destructive">Motivo: {v.motivo}</p> : null}
                        {v.aprovador ? (
                          <p className="mt-1 text-xs text-muted-foreground">Decidido por {v.aprovador}</p>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs ${CLASSE_STATUS_VEICULO[v.status]}`}
                      >
                        {ROTULO_STATUS_VEICULO[v.status]}
                      </span>
                    </div>
                    {v.status === "aprovado" ? (
                      <Button
                        size="sm"
                        variant={v.emUso ? "default" : "outline"}
                        className="mt-3"
                        onClick={() => escalar(v.id)}
                      >
                        <BadgeCheck className="size-4" /> {v.emUso ? "Em operação hoje" : "Escalar para operar"}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Frota já autorizada pela central
            </h2>
            <ul className="mt-4 space-y-2">
              {veiculosFrota.map((v) => (
                <li key={v.placa} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3">
                  <Car className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      {v.modelo} — {v.cor}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {v.placa} · {v.categoria} · {v.capacidade} ocupantes
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
