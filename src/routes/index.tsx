import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import qrWhatsapp from "@/assets/qr-whatsapp.png.asset.json";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Hospital } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Armchair,
  BriefcaseBusiness,
  Camera,
  Clock,
  GraduationCap,
  HeartHandshake,
  MessageCircle,
  Plane,
  ShieldCheck,
  ShoppingBasket,
  Stethoscope,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import {
  CATEGORIAS_CARGA,
  CATEGORIAS_PASSAGEIROS,
  ajudaCapacidade,
  capacidadeDaCategoria,
  capacidadeValida,
  faixaCapacidade,
  cargaDaCategoria,
  type CategoriaVeiculo,
} from "@/lib/dados";
import { formatarTelefone, validarContato } from "@/lib/contatos";
import { registrarPendente } from "@/lib/status-motorista";
import { criarAcesso, validarSenhas } from "@/lib/cadastro-acesso";
import { cadastrarCliente, gravarMotorista, gravarVeiculoFrota } from "@/lib/banco";

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

const WHATSAPP = "https://wa.me/5571996805321";

const PILARES = [
  { icone: Armchair, titulo: "Veículos confortáveis", texto: "Climatizados e higienizados " },
  { icone: ShieldCheck, titulo: "Segurança e confiança", texto: "Motoristas cadastrados e veículo sempre vinculado." },
  { icone: Clock, titulo: "Pontualidade", texto: "Chegada no horário combinado." },
  { icone: UserRoundCheck, titulo: "Atendimento executivo", texto: "Discrição tratamento personalizado." },
];

const MODALIDADES_VITRINE = [
  {
    icone: Hospital,
    nome: "Translado Casas de Apoio",
    resumo: "Transporte de pacientes e acompanhantes entre a Casa de Apoio e os hospitais.",
  },
  {
    icone: Plane,
    nome: "Executivo aeroporto",
    resumo: "Receptivo com acompanhamento do voo, auxílio com bagagens e espera na portaria.",
  },
  {
    icone: BriefcaseBusiness,
    nome: "Translado corporativo",
    resumo: "  Ideal para trajetos entre reuniões e almoços de négocios",
  },
  {
    icone: Stethoscope,
    nome: "Rota de plantonista",
    resumo: "Vários trechos no mesmo dia e escalas  de plantões com motorista de backup. Ideal para profissionais  de hospitais.",
  },
  {
    icone: HeartHandshake,
    nome: "Corrida assistida",
    resumo: " Rotas com destinos e trajetos semelhantes, com preço reduzidos. e compartilhados. Ideal para pessoas proximas da mesma rota.",
  },
  {
    icone: Camera,
    nome: "City tour",
    resumo: "Roteiro combinado ponto a ponto, com paradas e ajustes durante o trajeto.",
  },
  {
    icone: Truck,
    nome: "Carreto e pequenas mudanças",
    resumo: "Veículos de carga, transporte dos móveis e ajudantes opcionais.",
  },
  {
    icone: GraduationCap,
    nome: "Escolar ",
    resumo: "Rota fixa nos dias úteis e entrega apenas ao responsável cadastrado.",
  },
  {
    icone: ShoppingBasket,
    nome: "Compras & Supermercado",
    resumo:
      "Turno de manhã, tarde ou noite e apoio com as sacolas até a sua porta.",
  },
];

const BENEFICIOS_PLANO: Record<string, string[]> = {
  mensal: [
    "Ideal para começar com previsibilidade no mês",
    "Créditos de viagem liberados na contratação",
    "Troque de modalidade quando quiser",
  ],
  trimestral: [
    "Economia progressiva no ciclo de 3 meses",
    "Feito para escalas fixas e rotina de trabalho",
    "Atendimento prioritário na escolha do motorista",
  ],
  anual: [
    "Máxima economia do ano, com meses inclusos",
    "Chauffeur preferencial para sua rotina",
    "Maior saldo de créditos e total flexibilidade",
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "seuchauffeur — Transporte executivo particular com agendamento" },
      {
        name: "description",
        content:
          "Chauffeur particular com veículos climatizados, motoristas confirmados e planos de assinatura por créditos de viagem.",
      },
      { property: "og:title", content: "seuchauffeur — Premium Private Transport & Chauffeur Services" },
      {
        property: "og:description",
        content: "Modalidades executivas, rota de plantonista, carreto e planos de assinatura com créditos de viagem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Autenticacao,
});

function Autenticacao() {
  const [perfil, setPerfil] = useState<"cliente" | "motorista">("cliente");
  const [criandoConta, setCriandoConta] = useState(false);
  const [nomeConta, setNomeConta] = useState("");
  const [emailConta, setEmailConta] = useState("");
  const [whatsappConta, setWhatsappConta] = useState("");
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
    navigate({
      to: "/cliente/assinatura",
      search: { p: plano.periodicidade, v: plano.viagensPorMes, preco: plano.precoUnitarioAvulso },
    });
  };

  const [salvando, setSalvando] = useState(false);
  const [senhaConta, setSenhaConta] = useState("");
  const [senhaConfirmar, setSenhaConfirmar] = useState("");
  const esqueciSenha = async () => {
    const email = emailConta.trim().toLowerCase();
    if (!email.includes("@")) {
      toast.error("Digite seu e-mail acima para receber o link de redefinição.");
      document.getElementById("email")?.focus();
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return void toast.error("Não foi possível enviar o link. Tente novamente.");
    toast.success("Enviamos o link de redefinição para o seu e-mail.");
  };
  const entrar = async () => {
    if (salvando) return;
    if (criandoConta) {
      if (!nomeConta.trim()) {
        toast.error("Informe seu nome completo.");
        return;
      }
      const erroContato = validarContato(emailConta, whatsappConta);
      if (erroContato) {
        toast.error(erroContato);
        return;
      }
      const erroSenha = validarSenhas(senhaConta, senhaConfirmar);
      if (erroSenha) {
        toast.error(erroSenha);
        return;
      }
    }
    if (criandoConta && perfil === "motorista" && (!modelo || !placa || !cor)) {
      toast.error("Para se cadastrar como motorista, informe modelo, placa e cor do seu veículo.");
      return;
    }
    if (criandoConta) {
      setSalvando(true);
      const erroAcesso = await criarAcesso(emailConta, senhaConta, perfil === "cliente" ? "/cliente" : "/");
      setSalvando(false);
      if (erroAcesso) {
        toast.error(erroAcesso);
        return;
      }
    }

    if (criandoConta && perfil === "motorista") {
      const faixa = faixaCapacidade(categoria);
      const informada = Number(capacidade);
      if (faixa.ajustavel && (!Number.isFinite(informada) || informada < faixa.min || informada > faixa.max)) {
        toast.error(`Informe a lotação entre ${faixa.min} e ${faixa.max} ocupantes conforme o CRLV.`);
        return;
      }
      setSalvando(true);
      const nomeM = nomeConta.trim();
      await gravarMotorista({
        nome: nomeM,
        email: emailConta.trim().toLowerCase(),
        whatsapp: whatsappConta.trim(),
        status: "pendente",
        veiculo: `${modelo} — ${categoria}`,
        placa: placa.toUpperCase(),
        categoria,
      });
      await gravarVeiculoFrota(
        {
          placa,
          modelo,
          cor,
          categoria,
          capacidade: faixa.ajustavel ? capacidadeValida(categoria, informada) : capacidadeDaCategoria(categoria),
        },
        nomeM,
      );
      registrarPendente(nomeM);
      setSalvando(false);
      toast.success("Cadastro enviado! Seu acesso fica pendente até a aprovação do Administrador ou Gerente corporativo.");
      setCriandoConta(false);
      return;
    }
    if (!criandoConta && senhaConta) {
      setSalvando(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailConta.trim().toLowerCase(),
        password: senhaConta,
      });
      if (error || !data.user) {
        setSalvando(false);
        toast.error("E-mail ou senha incorretos.");
        return;
      }
      const { data: papeis } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      setSalvando(false);
      if (papeis?.some((p) => p.role === "admin" || p.role === "gerente")) {
        navigate({ to: "/admin" });
        return;
      }
    }
    if (perfil === "cliente" && nomeConta.trim()) {
      localStorage.setItem("seuchauffeur:cliente-nome", nomeConta.trim());
    }
    if (perfil === "cliente" && emailConta.trim()) {
      localStorage.setItem("seuchauffeur:cliente-email", emailConta.trim().toLowerCase());
    }
    if (criandoConta && perfil === "cliente") {
      setSalvando(true);
      const erro = await cadastrarCliente(nomeConta, emailConta, whatsappConta);
      setSalvando(false);
      if (erro) {
        toast.error(erro);
        return;
      }
      toast.success("Conta criada e salva com sucesso!");
    }
    navigate({ to: perfil === "cliente" ? "/cliente" : "/motorista/agendamentos" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-primary/25">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center">
          <p className="font-display text-4xl font-semibold uppercase tracking-[0.18em] text-gold sm:text-6xl">
            Seuchauffeur
          </p>
          <div className="mx-auto mt-4 flex max-w-md items-center gap-3">
            <span className="h-px flex-1 bg-primary/40" />
            <span className="text-primary">◆</span>
            <span className="h-px flex-1 bg-primary/40" />
          </div>
          <p className="mt-4 text-sm uppercase tracking-[0.22em] text-primary sm:text-base">
            Premium Private Transport &amp; Chauffeur Services
          </p>

          <h1 className="mt-10 font-display text-3xl font-semibold sm:text-4xl">{"\n"}</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Serviço exclusivo de agendamento e trajetos executivos climatizados.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href={WHATSAPP} target="_blank" rel="noreferrer">
                <MessageCircle /> Agende agora pelo WhatsApp
              </a>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <a href="#acesso">Entrar na minha conta</a>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">+55 (71) 99680-5321</p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILARES.map((p) => (
              <Card key={p.titulo} className="surface-luxe border-border/60 p-5 text-left">
                <p.icone className="size-6 text-primary" />
                <p className="mt-3 text-sm font-semibold uppercase tracking-wide">{p.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.texto}</p>
              </Card>
            ))}
          </div>
        </div>
      </header>

      {/* Modalidades */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Modalidades de serviço</p>
        <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
          Um atendimento desenhado para cada tipo de trajeto
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Cada modalidade tem procedimentos próprios de embarque e desembarque, informados ao motorista e ao cliente
          antes da corrida.
        </p>

        <Carousel className="mt-8" opts={{ align: "start" }}>
          <CarouselContent>
            {Array.from({ length: Math.ceil(MODALIDADES_VITRINE.length / 6) }, (_, p) =>
              MODALIDADES_VITRINE.slice(p * 6, p * 6 + 6),
            ).map((pagina, p) => (
              <CarouselItem key={p}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pagina.map((m) => (
                    <Card key={m.nome} className="border-border/60 p-6">
                      <div className="flex size-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                        <m.icone className="size-5 text-primary" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold">{m.nome}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{m.resumo}</p>
                    </Card>
                  ))}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-4 flex justify-end gap-2">
            <CarouselPrevious className="static translate-y-0" />
            <CarouselNext className="static translate-y-0" />
          </div>
        </Carousel>
      </section>

      {false && (<>
      {/* Planos sem preços */}
      <section className="border-y border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Planos de assinatura</p>
          <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
            Escolha o ritmo das suas viagens
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Você define quantas viagens faz por mês e recebe créditos de viagem válidos por {VALIDADE_CREDITOS_DIAS}{" "}
            dias. Os valores de cada plano são apresentados na confirmação da contratação.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
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

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {planosCalculados.map((plano) => (
              <Card
                key={plano.periodicidade}
                className={`flex flex-col p-6 ${
                  plano.periodicidade === "anual" ? "glow-gold border-primary/40" : "border-border/60"
                }`}
              >
                {plano.periodicidade === "anual" ? (
                  <span className="text-xs font-medium uppercase tracking-wide text-primary">Máxima economia</span>
                ) : (
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Assinatura {plano.rotulo.toLowerCase()}
                  </span>
                )}
                <h3 className="mt-2 font-display text-xl font-semibold">Plano {plano.rotulo}</h3>
                <p className="mt-2 text-sm text-primary">
                  {plano.viagensPorMes} viagens por mês · {plano.creditosTotais} créditos no ciclo
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {(BENEFICIOS_PLANO[plano.periodicidade] ?? []).map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="text-primary">•</span>
                      {b}
                    </li>
                  ))}
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Créditos acumuláveis por {VALIDADE_CREDITOS_DIAS} dias
                  </li>
                </ul>
                <Button
                  variant={plano.periodicidade === "anual" ? "default" : "secondary"}
                  className="mt-6 w-full"
                  onClick={() => assinar(plano)}
                >
                  Quero o plano {plano.rotulo.toLowerCase()}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>
      </>)}

      {/* Acesso */}
      <section id="acesso" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
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
                  onClick={() => {
                    setPerfil(tipo);
                    if (tipo === "motorista") setCriandoConta(false);
                  }}
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
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input
                    id="nome"
                    required
                    value={nomeConta}
                    onChange={(e) => setNomeConta(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail {criandoConta ? "*" : null}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={emailConta}
                  onChange={(e) => setEmailConta(e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>
              {criandoConta ? (
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">Telefone (WhatsApp) *</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    inputMode="tel"
                    required
                    value={whatsappConta}
                    onChange={(e) => setWhatsappConta(formatarTelefone(e.target.value))}
                    placeholder="(71) 99680-5321"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usamos este número para confirmar a corrida e falar com você no WhatsApp.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha">Senha</Label>
                  {!criandoConta ? (
                    <button
                      type="button"
                      onClick={esqueciSenha}
                      className="text-xs text-gold underline-offset-4 hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  ) : null}
                </div>
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  value={senhaConta}
                  onChange={(e) => setSenhaConta(e.target.value)}
                />
              </div>
              {criandoConta ? (
                <div className="space-y-2">
                  <Label htmlFor="senha2">Repetir senha *</Label>
                  <Input
                    id="senha2"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={senhaConfirmar}
                    onChange={(e) => setSenhaConfirmar(e.target.value)}
                  />
                  {senhaConfirmar && senhaConta !== senhaConfirmar ? (
                    <p className="text-xs text-destructive">As senhas não coincidem.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
                  )}
                </div>
              ) : null}
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
              {perfil === "cliente" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setCriandoConta((v) => !v)}
                >
                  {criandoConta ? "Já tenho conta" : "Criar conta"}
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/seja-motorista">Seja um motorista credenciado</Link>
                </Button>
              )}
            </form>
          </Card>

          <Card className="surface-luxe flex flex-col items-center justify-center border-primary/30 p-8 text-center">
            <QrCode />
            <p className="mt-5 font-display text-lg font-semibold text-gold">Agende agora</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-primary">Escaneie o QR Code</p>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Fale direto com Adeilton Oliveira pelo WhatsApp +55 (71) 99680-5321 e reserve seu trajeto executivo.
            </p>
            <Button asChild className="mt-6">
              <a href={WHATSAPP} target="_blank" rel="noreferrer">
                <MessageCircle /> Abrir conversa
              </a>
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}

function QrCode() {
  return (
    <a href={WHATSAPP} target="_blank" rel="noreferrer" className="block">
      <img
        src={qrWhatsapp.url}
        alt="QR Code para agendar pelo WhatsApp com Adeilton Oliveira"
        width={176}
        height={176}
        className="mx-auto w-44 rounded-lg border border-primary/40 bg-white p-2 shadow-lg"
      />
    </a>
  );
}
