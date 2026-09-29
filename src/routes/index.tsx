import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CATEGORIAS_CARGA,
  CATEGORIAS_PASSAGEIROS,
  ajudaCapacidade,
  capacidadeDaCategoria,
  capacidadeValida,
  faixaCapacidade,
  cargaDaCategoria,
  formatarBRL,
  type CategoriaVeiculo,
} from "@/lib/dados";
import {
  PRECO_UNITARIO_AVULSO,
  VALIDADE_CREDITOS_DIAS,
  VIAGENS_POR_MES_PADRAO,
  calcularTodosOsPlanos,
  carregarCreditos,
  chaveData,
  gerarLotes,
  salvarCreditos,
  type PlanoCalculado,
} from "@/lib/assinaturas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "seuchauffeur — Entrar e escolher seu plano" },
      {
        name: "description",
        content:
          "Acesse como cliente ou motorista, agende corridas com embarque, parada e desembarque e escolha um plano mensal.",
      },
      { property: "og:title", content: "seuchauffeur — Entrar e escolher seu plano" },
      {
        property: "og:description",
        content: "Transporte agendado com motoristas confirmados, pagamento por Pix, cartão ou plano mensal.",
      },
    ],
  }),
  component: Autenticacao,
});

function Autenticacao() {
  const [perfil, setPerfil] = useState<"cliente" | "motorista">("cliente");
  const [criandoConta, setCriandoConta] = useState(false);
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [cor, setCor] = useState("");
  const [categoria, setCategoriaState] = useState<CategoriaVeiculo>("Sedan");
  const [capacidade, setCapacidade] = useState(String(capacidadeDaCategoria("Sedan")));

  const setCategoria = (c: CategoriaVeiculo) => {
    setCategoriaState(c);
    setCapacidade(String(capacidadeDaCategoria(c)));
  };
  const [viagensPorMes, setViagensPorMes] = useState(VIAGENS_POR_MES_PADRAO);
  const navigate = useNavigate();

  const planosCalculados = calcularTodosOsPlanos(viagensPorMes, PRECO_UNITARIO_AVULSO);

  const assinar = (plano: PlanoCalculado) => {
    const hoje = chaveData(new Date());
    salvarCreditos([...carregarCreditos(), ...gerarLotes(plano, hoje)]);
    toast.success(
      `Plano ${plano.rotulo} contratado: ${plano.creditosTotais} créditos de viagem liberados.`,
    );
    navigate({ to: "/cliente" });
  };

  const entrar = () => {
    if (criandoConta && perfil === "motorista" && (!modelo || !placa || !cor)) {
      toast.error("Para se cadastrar como motorista, informe modelo, placa e cor do seu veículo.");
      return;
    }
    if (criandoConta && perfil === "motorista") {
      const faixa = faixaCapacidade(categoria);
      const informada = Number(capacidade);
      if (faixa.ajustavel && (!Number.isFinite(informada) || informada < faixa.min || informada > faixa.max)) {
        toast.error(`Informe a lotação entre ${faixa.min} e ${faixa.max} ocupantes conforme o CRLV.`);
        return;
      }
    }
    navigate({ to: perfil === "cliente" ? "/cliente" : "/motorista/agendamentos" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="surface-luxe border-border/60 p-8">
          <p className="font-display text-2xl font-semibold">
            seu<span className="text-gold">chauffeur</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {criandoConta ? "Crie sua conta em menos de um minuto." : "Entre para acompanhar seus agendamentos."}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-full border border-border/70 bg-secondary/60 p-1">
            {(["cliente", "motorista"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setPerfil(tipo)}
                className={`rounded-full py-2 text-sm font-medium capitalize transition-colors ${
                  perfil === tipo ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              entrar();
            }}
          >
            {criandoConta ? (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" placeholder="Seu nome" />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="voce@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" placeholder="••••••••" />
            </div>
            {criandoConta && perfil === "motorista" ? (
              <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  Seu veículo (obrigatório)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {categoria}:{" "}
                  {faixaCapacidade(categoria).ajustavel
                    ? `${capacidadeValida(categoria, Number(capacidade))} ocupantes`
                    : `${capacidadeDaCategoria(categoria)} ocupantes`}
                  {cargaDaCategoria(categoria) ? ` · ${cargaDaCategoria(categoria)}` : ""}
                </p>
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="modelo-cadastro">Modelo</Label>
                    <Input
                      id="modelo-cadastro"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      placeholder="Toyota Corolla"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="placa-cadastro">Placa</Label>
                      <Input
                        id="placa-cadastro"
                        value={placa}
                        onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                        placeholder="ABC-1D23"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cor-cadastro">Cor</Label>
                      <Input
                        id="cor-cadastro"
                        value={cor}
                        onChange={(e) => setCor(e.target.value)}
                        placeholder="Preto"
                      />
                    </div>
                  </div>
                  {(
                    [
                      { titulo: "Passageiros", lista: CATEGORIAS_PASSAGEIROS },
                      { titulo: "Carga (carretos e mudanças)", lista: CATEGORIAS_CARGA },
                    ] as const
                  ).map((grupo) => (
                    <div key={grupo.titulo} className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{grupo.titulo}</p>
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
                    <div className="space-y-2">
                      <Label htmlFor="capacidade-cadastro">
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
                          id="capacidade-cadastro"
                          inputMode="numeric"
                          value={capacidade}
                          onChange={(e) => setCapacidade(e.target.value)}
                          placeholder="15"
                        />
                      )}
                      <p className="text-xs text-muted-foreground">{ajudaCapacidade(categoria)}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <Button type="submit" className="w-full">
              {criandoConta ? "Criar conta" : "Entrar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setCriandoConta((v) => !v)}
            >
              {criandoConta ? "Já tenho conta" : "Criar conta"}
            </Button>
          </form>
        </Card>

        <div>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold">Planos para quem viaja sempre</h1>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Escolha quantas viagens você faz por mês e veja o desconto de cada período. Os créditos entram na sua
                conta e valem por {VALIDADE_CREDITOS_DIAS} dias.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Viagens por mês</span>
                {[2, 4, 8, 12].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setViagensPorMes(q)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      viagensPorMes === q
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <Card className="border-border/60 p-4 text-center">
              <QrCode />
              <p className="mt-3 text-xs text-muted-foreground">
                Escaneie para conhecer
                <br />
                a landing page
              </p>
            </Card>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {planosCalculados.map((plano) => (
              <Card
                key={plano.periodicidade}
                className={`p-6 ${plano.periodicidade === "anual" ? "glow-gold border-primary/40" : "border-border/60"}`}
              >
                {plano.periodicidade === "anual" ? (
                  <span className="text-xs font-medium uppercase tracking-wide text-primary">
                    Melhor economia
                  </span>
                ) : null}
                <h2 className="mt-2 text-lg font-semibold">Plano {plano.rotulo}</h2>
                <p className="mt-2 font-display text-2xl text-gold">{plano.exibicaoPrincipal}</p>
                <p className="mt-1 text-xs text-primary">{plano.exibicaoSecundaria}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <li>
                    {plano.viagensPorMes} viagens por mês · {plano.creditosTotais} créditos no total
                  </li>
                  <li>
                    Sem plano: {formatarBRL(plano.precoMensalSemDesconto)}/mês ({formatarBRL(plano.precoUnitarioAvulso)} por viagem)
                  </li>
                  <li>Desconto de {Math.round(plano.percentualDesconto * 100)}%</li>
                  <li>Créditos válidos por {VALIDADE_CREDITOS_DIAS} dias</li>
                  <li>Total do período: {formatarBRL(plano.valorTotalCiclo)}</li>
                </ul>
                <Button
                  variant={plano.periodicidade === "anual" ? "default" : "secondary"}
                  className="mt-5 w-full"
                  onClick={() => assinar(plano)}
                >
                  Assinar {plano.rotulo.toLowerCase()}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QrCode() {
  const celulas = Array.from({ length: 144 }, (_, i) => {
    const linha = Math.floor(i / 12);
    const coluna = i % 12;
    const cantos =
      (linha < 3 && coluna < 3) || (linha < 3 && coluna > 8) || (linha > 8 && coluna < 3);
    return cantos || (linha * coluna + linha + coluna) % 3 === 0;
  });

  return (
    <div className="mx-auto grid w-32 grid-cols-12 gap-px rounded-md bg-foreground p-2">
      {celulas.map((ativo, i) => (
        <span key={i} className={`aspect-square ${ativo ? "bg-background" : "bg-foreground"}`} />
      ))}
    </div>
  );
}
