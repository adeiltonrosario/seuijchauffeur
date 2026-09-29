import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Car, Clock, Plus, Route as RouteIcon, Ticket, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CAPACIDADE_PADRAO, TARIFA_PADRAO_POR_KM, TOLERANCIA_ESPERA_MIN, VALOR_ESPERA_POR_MINUTO, VALOR_MINIMO_POR_KM, calcularValorEspera, formatarBRL, modalidades as modalidadesIniciais, motoristas as motoristasIniciais, veiculos as veiculosIniciais } from "@/lib/dados";
import {
  DESCONTOS,
  PRECO_UNITARIO_AVULSO,
  VALIDADE_CREDITOS_DIAS,
  VIAGENS_POR_MES_PADRAO,
  calcularTodosOsPlanos,
  rotuloPeriodicidade,
  type Periodicidade,
} from "@/lib/assinaturas";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — seuchauffeur" },
      { name: "description", content: "Cadastre motoristas, veículos e defina modalidades de corrida e valores." },
      { property: "og:title", content: "Administração — seuchauffeur" },
      { property: "og:description", content: "Painel interno para gerenciar frota, motoristas e tabela de preços." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

type Categoria = CategoriaVeiculo;

function Admin() {
  // Motoristas
  const [motoristas, setMotoristas] = useState(motoristasIniciais);
  const [nome, setNome] = useState("");
  const [valorMotorista, setValorMotorista] = useState("");
  const [modeloMotorista, setModeloMotorista] = useState("");
  const [placaMotorista, setPlacaMotorista] = useState("");
  const [corMotorista, setCorMotorista] = useState("");
  const [categoriaMotorista, setCategoriaMotorista] = useState<Categoria>("Sedan");
  const [ajudantesMotorista, setAjudantesMotorista] = useState("0");
  const [valorAjudante, setValorAjudante] = useState(String(TAXA_AJUDANTE_PADRAO));
  const [taxaAjudantePlataforma, setTaxaAjudantePlataforma] = useState(String(TAXA_AJUDANTE_PADRAO));

  // Veículos
  const [veiculos, setVeiculos] = useState(veiculosIniciais);
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Sedan");

  // Modalidades
  const [modalidades, setModalidades] = useState(
    modalidadesIniciais.map((m, i) => ({
      nome: m.nome,
      caracteristicas: m.caracteristicas,
      valorBase: [320, 180, 540, 140, 220][i] ?? 200,
      porKm: m.valorPorKm,
    })),
  );

  const [novaModalidade, setNovaModalidade] = useState("");
  const [novoValorBase, setNovoValorBase] = useState("");
  const [novoPorKm, setNovoPorKm] = useState("");
  const [novasCaracteristicas, setNovasCaracteristicas] = useState("");

  // Espera nas paradas
  const [tolerancia, setTolerancia] = useState(String(TOLERANCIA_ESPERA_MIN));
  const [valorEsperaMinuto, setValorEsperaMinuto] = useState(String(VALOR_ESPERA_POR_MINUTO));

  // Assinaturas
  const [viagensMes, setViagensMes] = useState(String(VIAGENS_POR_MES_PADRAO));
  const [precoAvulso, setPrecoAvulso] = useState(String(PRECO_UNITARIO_AVULSO));
  const [descontos, setDescontos] = useState({
    mensal: String(DESCONTOS.mensal * 100),
    trimestral: String(DESCONTOS.trimestral * 100),
    anual: String(DESCONTOS.anual * 100),
  });

  const viagensMesNum = Math.max(1, Number(viagensMes) || VIAGENS_POR_MES_PADRAO);
  const precoAvulsoNum = Math.max(0, Number(precoAvulso) || 0);
  const precoSemDesconto = Math.round(viagensMesNum * precoAvulsoNum * 100) / 100;
  const planosAdmin = calcularTodosOsPlanos(viagensMesNum, precoAvulsoNum, {
    mensal: (Number(descontos.mensal) || 0) / 100,
    trimestral: (Number(descontos.trimestral) || 0) / 100,
    anual: (Number(descontos.anual) || 0) / 100,
  });


  const salvarMotorista = () => {
    if (!nome || !valorMotorista) {
      toast.error("Preencha nome e valor acordado.");
      return;
    }
    if (!modeloMotorista || !placaMotorista || !corMotorista) {
      toast.error("Todo motorista precisa de um veículo: informe modelo, placa e cor.");
      return;
    }
    const ajudantesNum = ehCategoriaCarga(categoriaMotorista) ? Math.min(Number(ajudantesMotorista) || 0, MAX_AJUDANTES) : 0;
    const valorAjudanteNum = ajudantesNum > 0 ? Math.max(0, Number(valorAjudante) || TAXA_AJUDANTE_PADRAO) : 0;
    setMotoristas((atual) => [
      ...atual,
      {
        nome,
        nota: 5,
        veiculo: `${modeloMotorista} — ${categoriaMotorista}`,
        placa: placaMotorista,
        valor: Number(valorMotorista),
        favorito: false,
        categoria: categoriaMotorista,
        ajudantes: ajudantesNum,
        valorAjudante: valorAjudanteNum,
      },
    ]);
    setVeiculos((atual) =>
      atual.some((v) => v.placa === placaMotorista)
        ? atual
        : [
            ...atual,
            {
              placa: placaMotorista,
              modelo: modeloMotorista,
              cor: corMotorista,
              categoria: categoriaMotorista,
              capacidade: capacidadeDaCategoria(categoriaMotorista),
            },
          ],
    );
    toast.success("Motorista cadastrado com o veículo vinculado.");
    setNome("");
    setValorMotorista("");
    setModeloMotorista("");
    setPlacaMotorista("");
    setCorMotorista("");
    setAjudantesMotorista("0");
    setValorAjudante(String(TAXA_AJUDANTE_PADRAO));
  };

  const salvarVeiculo = () => {
    if (!placa || !modelo || !cor) {
      toast.error("Preencha placa, modelo e cor.");
      return;
    }
    setVeiculos((atual) => [
      ...atual,
      { placa, modelo, cor, categoria, capacidade: capacidadeDaCategoria(categoria) },
    ]);
    toast.success("Veículo cadastrado.");
    setPlaca("");
    setModelo("");
    setCor("");
  };

  const salvarModalidade = () => {
    if (!novaModalidade || !novoValorBase) {
      toast.error("Informe o nome da modalidade e o valor base.");
      return;
    }
    if (!novasCaracteristicas.trim()) {
      toast.error("Descreva as características e procedimentos de embarque e desembarque.");
      return;
    }
    const porKm = Number(novoPorKm) || TARIFA_PADRAO_POR_KM;
    if (porKm < VALOR_MINIMO_POR_KM) {
      toast.error(`O valor por km não pode ser inferior a ${formatarBRL(VALOR_MINIMO_POR_KM)}/km.`);
      return;
    }
    setModalidades((atual) => [
      ...atual,
      {
        nome: novaModalidade,
        caracteristicas: novasCaracteristicas.trim(),
        valorBase: Number(novoValorBase),
        porKm,
      },
    ]);
    toast.success("Modalidade criada.");
    setNovaModalidade("");
    setNovoValorBase("");
    setNovoPorKm("");
    setNovasCaracteristicas("");
  };

  const atualizarModalidade = (indice: number, campo: "valorBase" | "porKm", valor: string) => {
    const numero = Number(valor) || 0;
    if (campo === "porKm" && numero > 0 && numero < VALOR_MINIMO_POR_KM) {
      toast.error(`Piso mínimo do sistema: ${formatarBRL(VALOR_MINIMO_POR_KM)} por km.`);
    }
    setModalidades((atual) =>
      atual.map((m, i) => (i === indice ? { ...m, [campo]: numero } : m)),
    );
  };


  const atualizarCaracteristicas = (indice: number, texto: string) => {
    setModalidades((atual) => atual.map((m, i) => (i === indice ? { ...m, caracteristicas: texto } : m)));
  };

  return (
    <AppShell
      titulo="Administração"
      descricao="Cadastre motoristas e veículos da frota e defina as modalidades de corrida com seus valores."
    >
      <Tabs defaultValue="motoristas">
        <TabsList>
          <TabsTrigger value="motoristas">Motoristas</TabsTrigger>
          <TabsTrigger value="veiculos">Veículos</TabsTrigger>
          <TabsTrigger value="modalidades">Modalidades e valores</TabsTrigger>
          <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
        </TabsList>

        <TabsContent value="motoristas" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="surface-luxe border-border/60 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Novo motorista</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Marcos Vinícius" />
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    Veículo vinculado (obrigatório)
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Todo veículo atende até {CAPACIDADE_PADRAO} passageiros.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="modelo-motorista">Modelo</Label>
                      <Input
                        id="modelo-motorista"
                        value={modeloMotorista}
                        onChange={(e) => setModeloMotorista(e.target.value)}
                        placeholder="Toyota Corolla"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placa-motorista">Placa</Label>
                      <Input
                        id="placa-motorista"
                        value={placaMotorista}
                        onChange={(e) => setPlacaMotorista(e.target.value.toUpperCase())}
                        placeholder="ABC-1D23"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cor-motorista">Cor</Label>
                      <Input
                        id="cor-motorista"
                        value={corMotorista}
                        onChange={(e) => setCorMotorista(e.target.value)}
                        placeholder="Preto"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {categorias.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategoriaMotorista(c)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          categoriaMotorista === c
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor-motorista">Valor acordado por corrida (R$)</Label>
                  <Input
                    id="valor-motorista"
                    inputMode="decimal"
                    value={valorMotorista}
                    onChange={(e) => setValorMotorista(e.target.value)}
                    placeholder="320"
                  />
                </div>
                <Button className="w-full" onClick={salvarMotorista}>
                  <UserPlus className="size-4" /> Cadastrar motorista
                </Button>
              </div>
            </Card>

            <Card className="border-border/60 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Motoristas cadastrados
              </h2>
              <ul className="mt-4 space-y-2">
                {motoristas.map((m) => (
                  <li
                    key={m.nome}
                    className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.veiculo} · nota {m.nota.toFixed(1)}
                      </p>
                    </div>
                    <span className="text-sm text-gold">{formatarBRL(m.valor)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="veiculos" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="surface-luxe border-border/60 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Novo veículo</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="admin-placa">Placa</Label>
                  <Input
                    id="admin-placa"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                    placeholder="ABC-1D23"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-cor">Cor</Label>
                  <Input id="admin-cor" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Preto" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="admin-modelo">Modelo</Label>
                  <Input
                    id="admin-modelo"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Toyota Corolla"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label>Categoria</Label>
                <div className="flex flex-wrap gap-2">
                  {categorias.map((c) => (
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
              <Button className="mt-5 w-full" onClick={salvarVeiculo}>
                <Car className="size-4" /> Cadastrar veículo
              </Button>
            </Card>

            <Card className="border-border/60 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Frota cadastrada</h2>
              <ul className="mt-4 space-y-2">
                {veiculos.map((v) => (
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
        </TabsContent>

        <TabsContent value="modalidades" className="mt-6">
          <Card className="mb-6 border-border/60 p-6">
            <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              <Clock className="size-4 text-primary" /> Espera nas paradas intermediárias
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cada parada soma os quilômetros do desvio ao trajeto e cobra o tempo de espera que passar da
              cortesia.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_1.4fr]">
              <div className="space-y-2">
                <Label htmlFor="tolerancia">Cortesia por parada (minutos)</Label>
                <Input
                  id="tolerancia"
                  inputMode="numeric"
                  value={tolerancia}
                  onChange={(e) => setTolerancia(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor-espera">Valor por minuto excedente (R$)</Label>
                <Input
                  id="valor-espera"
                  inputMode="decimal"
                  value={valorEsperaMinuto}
                  onChange={(e) => setValorEsperaMinuto(e.target.value)}
                />
              </div>
              <div className="rounded-lg bg-secondary/50 p-4 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Exemplo</p>
                <p className="mt-1 text-muted-foreground">
                  Parada de 15 minutos:{" "}
                  <span className="text-primary">
                    {formatarBRL(
                      calcularValorEspera(
                        [15],
                        Number(valorEsperaMinuto.replace(",", ".")) || 0,
                        Number(tolerancia) || 0,
                      ),
                    )}
                  </span>
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">

            <Card className="surface-luxe border-border/60 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Nova modalidade</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modalidade">Nome da modalidade</Label>
                  <Input
                    id="modalidade"
                    value={novaModalidade}
                    onChange={(e) => setNovaModalidade(e.target.value)}
                    placeholder="Transfer noturno"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor-base">Valor base (R$)</Label>
                  <Input
                    id="valor-base"
                    inputMode="decimal"
                    value={novoValorBase}
                    onChange={(e) => setNovoValorBase(e.target.value)}
                    placeholder="250"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="por-km">Adicional por km (R$)</Label>
                  <Input
                    id="por-km"
                    inputMode="decimal"
                    value={novoPorKm}
                    onChange={(e) => setNovoPorKm(e.target.value)}
                    placeholder="4,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caracteristicas">Características e procedimentos</Label>
                  <Textarea
                    id="caracteristicas"
                    rows={6}
                    value={novasCaracteristicas}
                    onChange={(e) => setNovasCaracteristicas(e.target.value)}
                    placeholder="Embarque: como o motorista recebe o cliente. Desembarque: como a corrida é encerrada. O que o serviço inclui."
                  />
                  <p className="text-xs text-muted-foreground">
                    Este texto aparece para o cliente ao agendar e para o motorista na corrida.
                  </p>
                </div>
                <Button className="w-full" onClick={salvarModalidade}>
                  <Plus className="size-4" /> Criar modalidade
                </Button>
              </div>
            </Card>

            <Card className="border-border/60 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Tabela de valores
              </h2>
              <ul className="mt-4 space-y-3">
                {modalidades.map((m, i) => (
                  <li key={m.nome} className="rounded-lg bg-secondary/50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <RouteIcon className="size-4 text-primary" /> {m.nome}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setModalidades((atual) => atual.filter((_, idx) => idx !== i));
                          toast.success("Modalidade removida.");
                        }}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={`Remover ${m.nome}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Valor base</Label>
                        <Input
                          inputMode="decimal"
                          value={String(m.valorBase)}
                          onChange={(e) => atualizarModalidade(i, "valorBase", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Por km (mínimo {formatarBRL(VALOR_MINIMO_POR_KM)})
                        </Label>
                        <Input
                          inputMode="decimal"
                          value={String(m.porKm)}
                          onChange={(e) => atualizarModalidade(i, "porKm", e.target.value)}
                        />
                        {m.porKm < VALOR_MINIMO_POR_KM && (
                          <p className="text-xs text-destructive">
                            Abaixo do piso de {formatarBRL(VALOR_MINIMO_POR_KM)} por km.
                          </p>
                        )}
                      </div>

                    </div>
                    <div className="mt-3 space-y-1">
                      <Label className="text-xs text-muted-foreground">Características e procedimentos</Label>
                      <Textarea
                        rows={5}
                        value={m.caracteristicas}
                        onChange={(e) => atualizarCaracteristicas(i, e.target.value)}
                        placeholder="Como proceder no embarque e no desembarque."
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Corrida de 12 km ≈ {formatarBRL(m.valorBase + m.porKm * 12)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assinaturas" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <Card className="h-fit border-border/60 p-5">
              <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                <Ticket className="size-4 text-primary" /> Parâmetros da assinatura
              </h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="viagens-mes">Viagens por mês</Label>
                  <Input
                    id="viagens-mes"
                    type="number"
                    min={1}
                    value={viagensMes}
                    onChange={(e) => setViagensMes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco-avulso">Preço unitário avulso (R$)</Label>
                  <Input
                    id="preco-avulso"
                    type="number"
                    min={0}
                    step="0.01"
                    value={precoAvulso}
                    onChange={(e) => setPrecoAvulso(e.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["mensal", "trimestral", "anual"] as Periodicidade[]).map((p) => (
                    <div key={p} className="space-y-2">
                      <Label htmlFor={`desc-${p}`}>{rotuloPeriodicidade[p]} (%)</Label>
                      <Input
                        id={`desc-${p}`}
                        type="number"
                        min={0}
                        max={100}
                        value={descontos[p]}
                        onChange={(e) => setDescontos((atual) => ({ ...atual, [p]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/30 p-4 text-xs text-muted-foreground">
                  Preço mensal sem desconto:{" "}
                  <span className="text-foreground">{formatarBRL(precoSemDesconto)}</span>
                  <br />
                  Créditos válidos por {VALIDADE_CREDITOS_DIAS} dias, acumuláveis.
                </div>
              </div>
            </Card>

            <Card className="border-border/60 p-5">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Planos calculados
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {planosAdmin.map((plano) => (
                  <div key={plano.periodicidade} className="rounded-lg border border-border/60 p-4">
                    <p className="text-sm font-semibold">Plano {plano.rotulo}</p>
                    <p className="mt-2 font-display text-xl text-gold">{plano.exibicaoPrincipal}</p>
                    <p className="mt-1 text-xs text-primary">{plano.exibicaoSecundaria}</p>
                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <li>Desconto: {Math.round(plano.percentualDesconto * 100)}%</li>
                      <li>Total do ciclo: {formatarBRL(plano.valorTotalCiclo)}</li>
                      <li>Sem desconto: {formatarBRL(plano.valorCicloSemDesconto)}</li>
                      <li>Economia: {formatarBRL(plano.economiaCiclo)}</li>
                      <li>Créditos: {plano.creditosTotais} viagens</li>
                      <li>Equivale a {plano.mesesGratisEquivalentes} mês(es) grátis</li>
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
