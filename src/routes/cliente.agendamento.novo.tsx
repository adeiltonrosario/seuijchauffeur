import { carregarStatus, motoristaAtivo } from "@/lib/status-motorista";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Clock,
  MapPin,
  PackageOpen,
  PiggyBank,
  Plus,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { BotaoSelecionarMapa } from "@/components/seletor-endereco-mapa";
import { calcularRota } from "@/components/finalizar-rota";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MAX_AJUDANTES,
  TOLERANCIA_ESPERA_MIN,
  TURNOS_COMPRAS,
  VALOR_ESPERA_POR_MINUTO,
  VALOR_MINIMO_POR_KM,
  calcularExcedenteFranquia,
  calcularValorCorrida,
  calcularValorEspera,
  capacidadeDaCategoria,
  cargaDaCategoria,
  categoriasDaModalidade,
  ehModalidadeDeCarga,
  ehModalidadePorTurno,
  formatarBRL,
  minutosCobradosEspera,
  modalidades,
  motoristas,
} from "@/lib/dados";
import { carregarAgenda, motoristaDisponivel } from "@/lib/disponibilidade";
import {
  carregarVeiculosMotorista,
  motoristaComConflito,
  veiculosAprovados,
} from "@/lib/veiculos-motorista";
import {
  VALIDADE_CREDITOS_DIAS,
  calcularTodosOsPlanos,
  carregarCreditos,
  gerarLotes,
  saldoDisponivel,
  salvarCreditos,
  type PlanoCalculado,
} from "@/lib/assinaturas";
import {
  DIARIA_ESTACIONAMENTO,
  PERCENTUAL_DESCONTO_PACOTE,
  ZONAS,
  calcularTransferZonas,
  identificarZona,
  type ModalidadeViagem,
} from "@/lib/precificacao-zonas";


export const Route = createFileRoute("/cliente/agendamento/novo")({
  head: () => ({
    meta: [
      { title: "Agendar corrida — seuchauffeur" },
      {
        name: "description",
        content:
          "Escolha a data no calendário, a modalidade e o motorista, depois defina o trajeto com cálculo automático por km.",
      },
      { property: "og:title", content: "Agendar corrida — seuchauffeur" },
      {
        property: "og:description",
        content: "Agenda, motorista e trajeto com valor calculado por quilômetro rodado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NovoAgendamento,
});

const HORARIOS_RAPIDOS = ["06:00", "07:30", "09:00", "18:00"];
const TAXA_SERVICO = 8;

const dataLonga = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });

type Parada = { id: number; endereco: string; espera: number };

type BlocoTrajetoProps = {
  prefixo: string;
  embarque: string;
  setEmbarque: (v: string) => void;
  placeholderEmbarque?: string;
  desembarque: string;
  setDesembarque: (v: string) => void;
  placeholderDesembarque?: string;
  paradas: Parada[];
  setParadas: Dispatch<SetStateAction<Parada[]>>;
};

function BlocoTrajeto({
  prefixo,
  embarque,
  setEmbarque,
  placeholderEmbarque,
  desembarque,
  setDesembarque,
  placeholderDesembarque,
  paradas,
  setParadas,
}: BlocoTrajetoProps) {
  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`embarque-${prefixo}`}>Embarque (origem)</Label>
        <div className="flex gap-2"><div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-success" />
          <Input
            id={`embarque-${prefixo}`}
            value={embarque}
            placeholder={placeholderEmbarque}
            onChange={(e) => setEmbarque(e.target.value)}
            className="pl-9"
          />
        </div>
        <BotaoSelecionarMapa valor={embarque} onConfirmar={setEmbarque} rotulo="embarque" />
        </div>
      </div>

      {paradas.map((p, i) => (
        <div key={p.id} className="space-y-2">
          <Label htmlFor={`parada-${prefixo}-${p.id}`}>Parada {i + 1} (opcional)</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-warning" />
              <Input
                id={`parada-${prefixo}-${p.id}`}
                value={p.endereco}
                onChange={(e) =>
                  setParadas((atual) =>
                    atual.map((x) => (x.id === p.id ? { ...x, endereco: e.target.value } : x)),
                  )
                }
                className="pl-9"
              />
            </div>
            <BotaoSelecionarMapa
              valor={p.endereco}
              rotulo={`parada ${i + 1}`}
              onConfirmar={(v) =>
                setParadas((atual) => atual.map((x) => (x.id === p.id ? { ...x, endereco: v } : x)))
              }
            />
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Remover parada ${i + 1}`}
              onClick={() => setParadas((atual) => atual.filter((x) => x.id !== p.id))}
            >
              <Trash2 />
            </Button>
          </div>

          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
            <Label htmlFor={`espera-${prefixo}-${p.id}`} className="flex items-center gap-2 text-xs">
              <Clock className="size-3.5 text-primary" /> Tempo de espera nesta parada (minutos)
            </Label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {[3, 10, 15, 30].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() =>
                    setParadas((atual) => atual.map((x) => (x.id === p.id ? { ...x, espera: min } : x)))
                  }
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    p.espera === min
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {min} min{min === TOLERANCIA_ESPERA_MIN ? " (grátis)" : ""}
                </button>
              ))}
              <Input
                id={`espera-${prefixo}-${p.id}`}
                inputMode="numeric"
                value={String(p.espera)}
                onChange={(e) =>
                  setParadas((atual) =>
                    atual.map((x) =>
                      x.id === p.id ? { ...x, espera: Math.max(0, Number(e.target.value) || 0) } : x,
                    ),
                  )
                }
                className="h-8 w-20"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {TOLERANCIA_ESPERA_MIN} minutos de cortesia; depois {formatarBRL(VALOR_ESPERA_POR_MINUTO)} por
              minuto. Cobrança desta parada:{" "}
              <span className="text-primary">
                {minutosCobradosEspera(p.espera)} min = {formatarBRL(calcularValorEspera([p.espera]))}
              </span>
            </p>
          </div>
        </div>
      ))}

      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          setParadas((atual) => [...atual, { id: Date.now(), endereco: "", espera: TOLERANCIA_ESPERA_MIN }])
        }
      >
        <Plus /> Adicionar outra parada
      </Button>

      <div className="space-y-2">
        <Label htmlFor={`desembarque-${prefixo}`}>Desembarque (destino)</Label>
        <div className="flex gap-2"><div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-destructive" />
          <Input
            id={`desembarque-${prefixo}`}
            value={desembarque}
            placeholder={placeholderDesembarque}
            onChange={(e) => setDesembarque(e.target.value)}
            className="pl-9"
          />
        </div>
        <BotaoSelecionarMapa valor={desembarque} onConfirmar={setDesembarque} rotulo="desembarque" />
        </div>
      </div>
    </div>
  );
}

function NovoAgendamento() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<1 | 2>(1);

  // Etapa 1
  const [tipo, setTipo] = useState<"Somente ida" | "Ida e retorno">("Somente ida");
  const [dataIda, setDataIda] = useState<Date | undefined>(new Date());
  const [horaIda, setHoraIda] = useState("07:30");
  const [dataRetorno, setDataRetorno] = useState<Date | undefined>(undefined);
  const [horaRetorno, setHoraRetorno] = useState("21:00");
  const [modalidade, setModalidade] = useState(modalidades[0]!);
  const [motorista, setMotorista] = useState(motoristas[0]!.nome);
  const [turnoId, setTurnoId] = useState<(typeof TURNOS_COMPRAS)[number]["id"]>("manha");

  // Etapa 2 — ida
  const [embarque, setEmbarque] = useState("Av. Paulista, 1400 — Bela Vista, São Paulo");
  const [paradas, setParadas] = useState<Parada[]>([
    { id: 1, endereco: "Rua Augusta, 900 — Consolação", espera: TOLERANCIA_ESPERA_MIN },
  ]);
  const [desembarque, setDesembarque] = useState("Aeroporto de Congonhas — Portão 2");
  const [distancia, setDistancia] = useState("20.5");

  // Etapa 2 — volta
  const [embarqueVolta, setEmbarqueVolta] = useState("");
  const [desembarqueVolta, setDesembarqueVolta] = useState("");
  const [paradasVolta, setParadasVolta] = useState<Parada[]>([]);
  const [distanciaVolta, setDistanciaVolta] = useState("");
  const [zonaManualVolta, setZonaManualVolta] = useState<number | undefined>(undefined);

  const [instrucoes, setInstrucoes] = useState("");
  const [pagamento, setPagamento] = useState<"Pix" | "Cartão de crédito" | "Plano mensal">("Pix");
  const [modoPreco, setModoPreco] = useState<"km" | "zona">("km");
  const [zonaManual, setZonaManual] = useState<number | undefined>(undefined);
  const [diasViagem, setDiasViagem] = useState("3");

  // Carreto e mudanças
  const [ajudantes, setAjudantes] = useState(0);
  const [itensCarga, setItensCarga] = useState("");
  const [acessoColeta, setAcessoColeta] = useState<"Térreo" | "Elevador de serviço" | "Escadas">("Térreo");
  const [acessoEntrega, setAcessoEntrega] = useState<"Térreo" | "Elevador de serviço" | "Escadas">("Térreo");

  // Planos de assinatura da modalidade escolhida
  const [viagensPorMes, setViagensPorMes] = useState(4);
  const [lotes, setLotes] = useState(() => carregarCreditos());
  const saldoCreditos = useMemo(() => saldoDisponivel(lotes), [lotes]);
  const planosDaModalidade = useMemo(
    () => calcularTodosOsPlanos(viagensPorMes, modalidade.precoAvulso),
    [viagensPorMes, modalidade.precoAvulso],
  );

  const assinarPlano = (plano: PlanoCalculado) => {
    window.location.assign(
      `/cliente/assinatura?p=${plano.periodicidade}&v=${plano.viagensPorMes}&preco=${plano.precoUnitarioAvulso}&mod=${encodeURIComponent(modalidade.nome)}`,
    );
  };


  const porTurno = ehModalidadePorTurno(modalidade);
  const turno = TURNOS_COMPRAS.find((t) => t.id === turnoId) ?? TURNOS_COMPRAS[0]!;
  const valorTurno = modalidade.valorTurno ?? modalidade.precoAvulso;
  const franquiaKm = modalidade.franquiaKm ?? 0;

  const idaEVolta = porTurno ? false : tipo === "Ida e retorno";
  const embarqueVoltaEfetivo = embarqueVolta.trim() || desembarque;
  const desembarqueVoltaEfetivo = desembarqueVolta.trim() || embarque;

  const cargaSelecionada = ehModalidadeDeCarga(modalidade);
  const categoriasAceitas = useMemo(() => categoriasDaModalidade(modalidade), [modalidade]);
  const agenda = useMemo(() => carregarAgenda(), []);
  const veiculosExtras = useMemo(() => carregarVeiculosMotorista(), []);
  const motoristasDisponiveis = useMemo(
    () =>
      motoristas
        .filter((m) => motoristaAtivo(carregarStatus(), m.nome))
        .filter(
          (m) =>
            categoriasAceitas.includes(m.categoria) ||
            veiculosAprovados(veiculosExtras, m.nome).some((v) => categoriasAceitas.includes(v.categoria)),
        )
        .filter((m) => (dataIda ? motoristaDisponivel(agenda, m.nome, dataIda, horaIda) : true))
        .filter((m) => (dataIda ? !motoristaComConflito(m.nome, dataIda, horaIda) : true)),
    [agenda, dataIda, horaIda, categoriasAceitas, veiculosExtras],
  );
  const escolhido =
    motoristasDisponiveis.find((m) => m.nome === motorista) ?? motoristasDisponiveis[0] ?? motoristas[0]!;
  const maxAjudantes = Math.min(escolhido.ajudantes, MAX_AJUDANTES);
  const ajudantesEfetivos = cargaSelecionada ? Math.min(ajudantes, maxAjudantes) : 0;
  const valorAjudantes = Math.round(ajudantesEfetivos * escolhido.valorAjudante * 100) / 100;
  // Cálculo automático da distância (ida e volta) a partir dos endereços, sem digitação.
  const [rotaAuto, setRotaAuto] = useState({ calculando: false, falha: false });
  const chaveIda = [embarque, ...paradas.map((p) => p.endereco), desembarque].join("|");
  const chaveVolta = idaEVolta
    ? [embarqueVolta || desembarque, ...paradasVolta.map((p) => p.endereco), desembarqueVolta || embarque].join("|")
    : "";
  useEffect(() => {
    const ida = chaveIda.split("|").filter((s) => s.trim());
    if (!embarque.trim() || !desembarque.trim()) return;
    let ativo = true;
    const t = setTimeout(async () => {
      setRotaAuto({ calculando: true, falha: false });
      try {
        const r = await calcularRota(ida);
        if (!ativo) return;
        setDistancia(String(r.km));
        localStorage.setItem("seuchauffeur:ultima-rota-km", String(r.km));
        if (chaveVolta) {
          const v = await calcularRota(chaveVolta.split("|").filter((s) => s.trim()));
          if (ativo) setDistanciaVolta(String(v.km));
        } else setDistanciaVolta("");
        if (ativo) setRotaAuto({ calculando: false, falha: false });
      } catch {
        if (ativo) setRotaAuto({ calculando: false, falha: true });
      }
    }, 800);
    return () => { ativo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveIda, chaveVolta]);
  const kmIda = Math.max(Number(distancia.replace(",", ".")) || 0, 0);
  const kmVoltaInformado = Math.max(Number(distanciaVolta.replace(",", ".")) || 0, 0);
  const kmVolta = idaEVolta ? (kmVoltaInformado > 0 ? kmVoltaInformado : kmIda) : 0;
  const km = kmIda + kmVolta;
  const tarifa = Math.max(modalidade.valorPorKm, VALOR_MINIMO_POR_KM);
  const valorIda = useMemo(() => calcularValorCorrida(kmIda, tarifa), [kmIda, tarifa]);
  const valorVolta = useMemo(
    () => (idaEVolta ? calcularValorCorrida(kmVolta, tarifa) : 0),
    [idaEVolta, kmVolta, tarifa],
  );
  const descontoKm = idaEVolta
    ? Math.round((valorIda + valorVolta) * PERCENTUAL_DESCONTO_PACOTE * 100) / 100
    : 0;
  const valorTrajeto = Math.round((valorIda + valorVolta - descontoKm) * 100) / 100;
  const kmExcedente = porTurno ? Math.max(0, Math.round((kmIda - franquiaKm) * 100) / 100) : 0;
  const valorExcedente = porTurno ? calcularExcedenteFranquia(kmIda, franquiaKm, modalidade.valorPorKm) : 0;
  const valorDoTurno = porTurno ? Math.round((valorTurno + valorExcedente) * 100) / 100 : 0;

  const paradasTodas = useMemo(
    () => [...paradas, ...(idaEVolta ? paradasVolta : [])],
    [paradas, paradasVolta, idaEVolta],
  );
  const minutosEspera = useMemo(
    () => paradasTodas.reduce((t, p) => t + minutosCobradosEspera(p.espera), 0),
    [paradasTodas],
  );
  const valorEspera = useMemo(
    () => calcularValorEspera(paradasTodas.map((p) => p.espera)),
    [paradasTodas],
  );
  const dias = Math.max(1, Math.floor(Number(diasViagem) || 1));
  const modalidadeViagem: ModalidadeViagem = idaEVolta ? "IDA_E_VOLTA" : "SOMENTE_IDA";
  const pickup = useMemo(() => {
    if (!dataIda) return undefined;
    const [h, m] = horaIda.split(":").map(Number);
    const d = new Date(dataIda);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d;
  }, [dataIda, horaIda]);
  const zonaDetectada = useMemo(() => identificarZona(`${embarque} ${desembarque}`), [embarque, desembarque]);
  const transfer = useMemo(
    () =>
      calcularTransferZonas({
        origem: embarque,
        destino: desembarque,
        modalidade: modalidadeViagem,
        horaPartida: horaIda,
        horaRetorno: horaRetorno,
        diasViagem: dias,
        pickup,
        zonaManual,
        origemRetorno: embarqueVoltaEfetivo,
        destinoRetorno: desembarqueVoltaEfetivo,
        zonaManualRetorno: zonaManualVolta,
      }),
    [
      embarque,
      desembarque,
      modalidadeViagem,
      horaIda,
      horaRetorno,
      dias,
      pickup,
      zonaManual,
      embarqueVoltaEfetivo,
      desembarqueVoltaEfetivo,
      zonaManualVolta,
    ],
  );
  const precoFinal = porTurno ? valorDoTurno : modoPreco === "zona" ? transfer.final_trip_price : valorTrajeto;
  const desconto = porTurno ? 0 : modoPreco === "zona" ? transfer.package_discount : descontoKm;
  const esperaCobrada = porTurno ? 0 : valorEspera;
  const total = Math.round((precoFinal + esperaCobrada + valorAjudantes + TAXA_SERVICO) * 100) / 100;
  const custoEstacionamento = dias * DIARIA_ESTACIONAMENTO;
  const economia = Math.round((custoEstacionamento - total) * 100) / 100;


  const avancar = () => {
    if (!dataIda) {
      toast.error("Escolha a data da ida no calendário.");
      return;
    }
    if (!porTurno && tipo === "Ida e retorno" && !dataRetorno) {
      toast.error("Escolha também a data de retorno.");
      return;
    }
    if (motoristasDisponiveis.length === 0) {
      toast.error("Nenhum veículo desta modalidade está disponível neste dia e horário.");
      return;
    }
    setEtapa(2);
  };

  const confirmar = () => {
    if (!embarque.trim() || !desembarque.trim()) {
      toast.error("Informe o endereço de embarque e de desembarque.");
      return;
    }
    if (km <= 0) {
      toast.error("Informe a distância estimada do trajeto.");
      return;
    }
    if (cargaSelecionada && !itensCarga.trim()) {
      toast.error("Liste os itens que serão transportados no carreto.");
      return;
    }
    toast.success(`Agendamento enviado a ${escolhido.nome}. Total ${formatarBRL(total)}.`);
    navigate({ to: "/cliente/pagamento" });
  };

  return (
    <AppShell
      titulo="Agendar corrida"
      descricao="Primeiro a agenda e o motorista, depois o trajeto com valor calculado por km."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        {(
          [
            { n: 1 as const, rotulo: "Agenda e motorista" },
            { n: 2 as const, rotulo: "Trajeto e pagamento" },
          ]
        ).map((p, indice) => (
          <div key={p.n} className="flex items-center gap-3">
            {indice > 0 && <span className="h-px w-8 bg-border" />}
            <button
              type="button"
              onClick={() => setEtapa(p.n)}
              className={cn(
                "rounded-full border px-4 py-2 transition-colors",
                etapa === p.n
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p.n}. {p.rotulo}
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {etapa === 1 ? (
            <>
              <Card className="border-border/60 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Selecione o dia e o horário
                </h2>

                {porTurno ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Este serviço é fechado por turno: o motorista leva você de casa ao supermercado, acompanha as
                    compras e volta com você — tudo dentro do turno escolhido.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["Somente ida", "Ida e retorno"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTipo(t);
                          if (t === "Somente ida") setDataRetorno(undefined);
                        }}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm transition-colors",
                          tipo === t
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <CalendarDays className="size-4 text-primary" /> Data da ida
                    </p>
                    <Calendar
                      mode="single"
                      selected={dataIda}
                      onSelect={setDataIda}
                      disabled={{ before: new Date() }}
                      className={cn("pointer-events-auto rounded-lg border border-border/60 p-3")}
                    />
                    {porTurno ? (
                      <div className="mt-3 space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="size-4 text-primary" /> Turno do atendimento
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {TURNOS_COMPRAS.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setTurnoId(t.id);
                                setHoraIda(t.inicio);
                              }}
                              className={cn(
                                "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                                turnoId === t.id
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <span className="block text-sm font-medium">{t.rotulo}</span>
                              {t.inicio} às {t.fim} · {t.horas}h
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{turno.resumo}</p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="hora-ida" className="flex items-center gap-2">
                          <Clock className="size-4 text-primary" /> Horário de embarque
                        </Label>
                        <Input
                          id="hora-ida"
                          type="time"
                          value={horaIda}
                          onChange={(e) => setHoraIda(e.target.value)}
                          className="w-32"
                        />
                        <div className="flex flex-wrap gap-2">
                          {HORARIOS_RAPIDOS.map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setHoraIda(h)}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs transition-colors",
                                horaIda === h
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!porTurno && tipo === "Ida e retorno" && (
                    <div>
                      <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <CalendarDays className="size-4 text-primary" /> Data do retorno
                      </p>
                      <Calendar
                        mode="single"
                        selected={dataRetorno}
                        onSelect={setDataRetorno}
                        disabled={{ before: dataIda ?? new Date() }}
                        className={cn("pointer-events-auto rounded-lg border border-border/60 p-3")}
                      />
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="hora-retorno" className="flex items-center gap-2">
                          <Clock className="size-4 text-primary" /> Horário do retorno
                        </Label>
                        <Input
                          id="hora-retorno"
                          type="time"
                          value={horaRetorno}
                          onChange={(e) => setHoraRetorno(e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="border-border/60 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Modalidade de atendimento
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {modalidades.map((m) => (
                    <button
                      key={m.nome}
                      type="button"
                      onClick={() => {
                        setModalidade(m);
                        setAjudantes(0);
                        if (ehModalidadePorTurno(m)) {
                          setTipo("Somente ida");
                          setDataRetorno(undefined);
                          setModoPreco("km");
                          setHoraIda(TURNOS_COMPRAS.find((t) => t.id === turnoId)?.inicio ?? "08:00");
                        }
                      }}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition-colors",
                        modalidade.nome === m.nome
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {ehModalidadeDeCarga(m) ? "🚚 " : ""}
                      {ehModalidadePorTurno(m) ? "🛒 " : ""}
                      {m.nome}
                      {["Executivo aeroporto", "Corrida assistida", "Carreto e pequenas mudanças"].includes(m.nome) ? " ·" : ""}
                      {"\u00a0"}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    Características e procedimentos
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{modalidade.caracteristicas}</p>
                </div>

                {porTurno ? (
                  <div className="glow-gold mt-4 rounded-lg border border-primary/40 p-4">
                    <p className="text-sm font-medium">
                      Turno {turno.rotulo} · {turno.inicio} às {turno.fim} — {formatarBRL(valorTurno)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Inclui {franquiaKm} km somando a ida até o supermercado e a volta para casa. O km que passar da
                      franquia é cobrado a {formatarBRL(Math.max(modalidade.valorPorKm, VALOR_MINIMO_POR_KM))} por km.
                    </p>
                  </div>
                ) : null}

                {modalidade.nome === "Translado Casas de Apoio" ? (
                  <div className="glow-gold mt-4 rounded-lg border border-primary/40 p-4">
                    <p className="text-sm font-medium">Modalidade com liberação do administrador</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Embarque fixo na Casa de Apoio, lista de pacientes e acompanhantes e cobrança por paciente.
                    </p>
                    <Button className="mt-3" asChild>
                      <Link to="/cliente/casa-apoio">Abrir Translado Casas de Apoio</Link>
                    </Button>
                  </div>
                ) : null}

                {modalidade.nome === "Rota de plantonista" ? (
                  <div className="glow-gold mt-4 rounded-lg border border-primary/40 p-4">
                    <p className="text-sm font-medium">Monte sua escala de plantão</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Esta modalidade tem vários trechos no mesmo dia (ida ao plantão, troca de hospital e retorno) e
                      repetição por escala 12x36, 24x72 ou semanal.
                    </p>
                    <Button className="mt-3" asChild>
                      <Link to="/cliente/plantao">Abrir jornada de plantão</Link>
                    </Button>
                  </div>
                ) : null}
              </Card>

              <Card className="border-border/60 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      <Ticket className="size-4 text-primary" /> Planos para {modalidade.nome}
                    </h2>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      Viagem avulsa desta modalidade: {formatarBRL(modalidade.precoAvulso)}. Assine e pague esta corrida
                      com 1 crédito — válidos por {VALIDADE_CREDITOS_DIAS} dias.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Viagens por mês</span>
                    {[2, 4, 8, 12].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setViagensPorMes(q)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition-colors",
                          viagensPorMes === q
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {planosDaModalidade.map((plano) => (
                    <div
                      key={plano.periodicidade}
                      className={cn(
                        "rounded-lg border p-4",
                        plano.periodicidade === "anual" ? "glow-gold border-primary/40" : "border-border/60",
                      )}
                    >
                      {plano.periodicidade === "anual" ? (
                        <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                          Melhor economia
                        </span>
                      ) : null}
                      <p className="mt-1 text-sm font-medium">Plano {plano.rotulo}</p>
                      <p className="mt-1 font-display text-xl text-gold">{plano.exibicaoPrincipal}</p>
                      <p className="mt-1 text-xs text-primary">{plano.exibicaoSecundaria}</p>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <li>
                          {plano.viagensPorMes} viagens/mês · {plano.creditosTotais} créditos
                        </li>
                        <li>Sem plano: {formatarBRL(plano.precoMensalSemDesconto)}/mês</li>
                        <li>Desconto de {Math.round(plano.percentualDesconto * 100)}%</li>
                        <li>Total do período: {formatarBRL(plano.valorTotalCiclo)}</li>
                      </ul>
                      <Button
                        variant={plano.periodicidade === "anual" ? "default" : "secondary"}
                        className="mt-4 w-full"
                        onClick={() => assinarPlano(plano)}
                      >
                        Assinar e usar crédito
                      </Button>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  {saldoCreditos > 0
                    ? `Você tem ${saldoCreditos} crédito(s) disponível(is) — esta corrida pode ser paga com 1 crédito.`
                    : "Sem plano ativo: siga com a corrida avulsa e pague por Pix ou cartão na próxima etapa."}
                </p>
              </Card>

              <Card className="border-border/60 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  {cargaSelecionada ? "Veículos de carga disponíveis" : "Motoristas disponíveis"}{" "}
                  {dataIda ? `para ${dataIda.toLocaleDateString("pt-BR")} às ${horaIda}` : ""}
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Categorias aceitas nesta modalidade: {categoriasAceitas.join(" · ")}
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {motoristasDisponiveis.map((m) => (
                    <li key={m.nome}>
                      <button
                        type="button"
                        onClick={() => setMotorista(m.nome)}
                        className={cn(
                          "w-full rounded-lg border p-4 text-left transition-colors",
                          escolhido.nome === m.nome ? "border-primary/50 bg-primary/10" : "border-border/70",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{m.nome}</span>
                          <span className="text-sm text-primary">{m.nota} ★</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {m.veiculo} · {m.placa}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {capacidadeDaCategoria(m.categoria)} ocupantes
                          {cargaDaCategoria(m.categoria) ? ` · ${cargaDaCategoria(m.categoria)}` : ""}
                        </p>
                        {cargaSelecionada ? (
                          <p className="text-xs text-primary">
                            {m.ajudantes > 0
                              ? `Até ${Math.min(m.ajudantes, MAX_AJUDANTES)} ajudante(s) · ${formatarBRL(m.valorAjudante)} cada`
                              : "Não oferece ajudantes"}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
                {motoristasDisponiveis.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Nenhum veículo desta modalidade disponível neste dia e horário. Tente outro horário ou outra data.
                  </p>
                ) : null}
              </Card>
            </>
          ) : (
            <>
              <Card className="border-border/60 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Pontos do percurso {idaEVolta ? "— ida" : ""}
                </h2>
                <BlocoTrajeto
                  prefixo="ida"
                  embarque={embarque}
                  setEmbarque={setEmbarque}
                  desembarque={desembarque}
                  setDesembarque={setDesembarque}
                  paradas={paradas}
                  setParadas={setParadas}
                />

                <div className="mt-4 space-y-2">
                  <Label htmlFor="instrucoes">Instruções de acesso ao motorista</Label>
                  <Input
                    id="instrucoes"
                    value={instrucoes}
                    onChange={(e) => setInstrucoes(e.target.value)}
                    placeholder="Ex.: aguardar na portaria social, interfone 102."
                  />
                </div>
              </Card>

              {cargaSelecionada && (
                <Card className="border-border/60 p-6">
                  <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    <PackageOpen className="size-4 text-primary" /> Carga, itens e ajudantes
                  </h2>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="itens-carga">Itens a transportar</Label>
                    <Textarea
                      id="itens-carga"
                      value={itensCarga}
                      onChange={(e) => setItensCarga(e.target.value)}
                      rows={3}
                      placeholder="Ex.: 1 geladeira frost free, 1 fogão 4 bocas, 1 TV 65 polegadas e 6 caixas."
                    />
                    <p className="text-xs text-muted-foreground">
                      Veículo do motorista: {escolhido.veiculo} — {cargaDaCategoria(escolhido.categoria)}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        { rotulo: "Acesso na coleta", valor: acessoColeta, set: setAcessoColeta },
                        { rotulo: "Acesso na entrega", valor: acessoEntrega, set: setAcessoEntrega },
                      ] as const
                    ).map((campo) => (
                      <div key={campo.rotulo} className="space-y-2">
                        <Label>{campo.rotulo}</Label>
                        <div className="flex flex-wrap gap-2">
                          {(["Térreo", "Elevador de serviço", "Escadas"] as const).map((op) => (
                            <button
                              key={op}
                              type="button"
                              onClick={() => campo.set(op)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                                campo.valor === op
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {op}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-lg border border-border/60 bg-secondary/30 p-4">
                    <Label className="flex items-center gap-2 text-xs">
                      <Users className="size-3.5 text-primary" /> Ajudantes de carga
                    </Label>
                    {maxAjudantes > 0 ? (
                      <>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Array.from({ length: maxAjudantes + 1 }, (_, n) => n).map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setAjudantes(n)}
                              className={cn(
                                "rounded-full border px-4 py-2 text-sm transition-colors",
                                ajudantesEfetivos === n
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {n === 0 ? "Sem ajudante" : `${n} ajudante${n > 1 ? "s" : ""}`}
                            </button>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {ajudantesEfetivos === 0
                            ? "Sem ajudante o motorista apenas dirige e acomoda a carga no veículo; o carregamento pesado fica com você."
                            : `${ajudantesEfetivos} ajudante(s) × ${formatarBRL(escolhido.valorAjudante)} = ${formatarBRL(valorAjudantes)} — carregam e descarregam móveis e eletrodomésticos.`}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Este motorista não disponibiliza ajudantes. Escolha outro veículo de carga na etapa anterior se
                        precisar de equipe.
                      </p>
                    )}
                  </div>
                </Card>
              )}



              {idaEVolta && (
                <Card className="border-border/60 p-6">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Pontos do percurso — volta
                  </h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Preenchemos automaticamente com o inverso da ida. Edite se o retorno partir ou terminar em outro
                    endereço.
                  </p>
                  <BlocoTrajeto
                    prefixo="volta"
                    embarque={embarqueVolta}
                    setEmbarque={setEmbarqueVolta}
                    placeholderEmbarque={desembarque}
                    desembarque={desembarqueVolta}
                    setDesembarque={setDesembarqueVolta}
                    placeholderDesembarque={embarque}
                    paradas={paradasVolta}
                    setParadas={setParadasVolta}
                  />
                </Card>
              )}

              <Card className={cn("border-border/60 p-6", porTurno && "hidden")}>
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Forma de cobrança
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      { v: "km" as const, r: "Por quilômetro rodado" },
                      { v: "zona" as const, r: "Preço fixo por zona (transfer aeroporto)" },
                    ]
                  ).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setModoPreco(o.v)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition-colors",
                        modoPreco === o.v
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {o.r}
                    </button>
                  ))}
                </div>

                {modoPreco === "zona" && (
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-sm font-medium">
                        Zona identificada pelo endereço: {transfer.zone_name} ·{" "}
                        <span className="text-primary">{formatarBRL(ZONAS.find((z) => z.zone_id === transfer.zone_id)!.valor)} por trecho</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Detectada por bairro ou CEP ({zonaDetectada.nome}). Você pode ajustar manualmente abaixo.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setZonaManual(undefined)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition-colors",
                            zonaManual === undefined
                              ? "border-primary/50 bg-primary/15 text-primary"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          Automática
                        </button>
                        {ZONAS.map((z) => (
                          <button
                            key={z.zone_id}
                            type="button"
                            onClick={() => setZonaManual(z.zone_id)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs transition-colors",
                              zonaManual === z.zone_id
                                ? "border-primary/50 bg-primary/15 text-primary"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {z.nome} · {formatarBRL(z.valor)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {idaEVolta && (
                      <div>
                        <p className="text-sm font-medium">
                          Zona do retorno: {transfer.zone_name_retorno} ·{" "}
                          <span className="text-primary">{formatarBRL(transfer.fare_retorno)} por trecho</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Detectada pelos endereços do trajeto de volta. Ajuste manualmente se precisar.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setZonaManualVolta(undefined)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs transition-colors",
                              zonaManualVolta === undefined
                                ? "border-primary/50 bg-primary/15 text-primary"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            Automática
                          </button>
                          {ZONAS.map((z) => (
                            <button
                              key={z.zone_id}
                              type="button"
                              onClick={() => setZonaManualVolta(z.zone_id)}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs transition-colors",
                                zonaManualVolta === z.zone_id
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground",
                              )}
                            >
                              {z.nome} · {formatarBRL(z.valor)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg bg-secondary/50 p-4 text-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-primary">
                        Memória de cálculo por zona
                      </p>
                      <p className="mt-2 text-muted-foreground">
                        Ida ({transfer.zone_name}): {formatarBRL(transfer.fare_ida)}
                      </p>
                      {idaEVolta && (
                        <p className="text-muted-foreground">
                          Volta ({transfer.zone_name_retorno}): {formatarBRL(transfer.fare_retorno)}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        Soma dos trechos: {formatarBRL(transfer.base_fare)}
                      </p>
                      {transfer.package_discount > 0 && (
                        <p className="text-success">
                          Desconto pacote ida e volta (15%): −{formatarBRL(transfer.package_discount)}
                        </p>
                      )}
                      {transfer.night_surcharge > 0 && (
                        <p className="text-warning">
                          Adicional noturno (23h às 05h, 15%): +{formatarBRL(transfer.night_surcharge)}
                        </p>
                      )}
                      <p className="font-display text-lg text-primary">
                        {formatarBRL(transfer.final_trip_price)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="dias-viagem" className="flex items-center gap-2">
                      <PiggyBank className="size-4 text-success" /> Quantos dias durará sua viagem?
                    </Label>
                    <Input
                      id="dias-viagem"
                      inputMode="numeric"
                      value={diasViagem}
                      onChange={(e) => setDiasViagem(e.target.value)}
                      className="w-24"
                    />
                  </div>
                  <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-success">
                      Compare com o estacionamento do aeroporto
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      Estacionamento por {dias} {dias === 1 ? "dia" : "dias"} ({formatarBRL(DIARIA_ESTACIONAMENTO)}/dia):{" "}
                      <span className="text-foreground">{formatarBRL(custoEstacionamento)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Seu transfer: <span className="text-foreground">{formatarBRL(total)}</span>
                    </p>
                    {economia > 0 ? (
                      <p className="mt-1 font-display text-base text-success">
                        Você economiza {formatarBRL(economia)}!
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Nesta duração o estacionamento sai mais barato; o transfer entrega conforto porta a porta.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <Bell className="size-4 text-primary" /> Lembretes automáticos
                  </h3>
                  {transfer.scheduled_notifications.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                      {transfer.scheduled_notifications.map((n) => (
                        <li
                          key={n.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2"
                        >
                          <span>
                            {n.marco === "24h_antes" ? "24 horas antes" : "2 horas antes"} ·{" "}
                            {n.canal === "WHATSAPP" ? "WhatsApp" : "Notificação no app"}
                          </span>
                          <span className="text-primary">
                            {new Date(n.datetime).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Escolha a data e o horário da ida para programar os lembretes.
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Mensagem enviada: “{transfer.scheduled_notifications[0]?.mensagem ?? "Olá! Seu transfer executivo para o aeroporto está agendado. Nosso motorista estará à sua disposição no local combinado com antecedência."}”
                  </p>
                </div>
              </Card>

              <Card className="border-border/60 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Distância e cálculo do valor
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-4">
                    <p className={`text-sm ${rotaAuto.falha ? "text-destructive" : "text-muted-foreground"}`}>
                      {rotaAuto.calculando
                        ? "Calculando o trajeto pelos endereços informados…"
                        : rotaAuto.falha
                          ? "Não foi possível calcular a rota automaticamente. Informe os km abaixo."
                          : kmIda > 0
                            ? "Distância calculada automaticamente pelos endereços (incluindo paradas)."
                            : "Informe embarque e desembarque para calcular a distância automaticamente."}
                    </p>
                    {rotaAuto.falha && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="distancia">
                            {porTurno ? "Distância total do turno (ida + volta, em km)" : "Distância da ida (km)"}
                          </Label>
                          <Input id="distancia" inputMode="decimal" value={distancia} onChange={(e) => setDistancia(e.target.value)} />
                        </div>
                        {idaEVolta && (
                          <div className="space-y-2">
                            <Label htmlFor="distancia-volta">Distância da volta (km)</Label>
                            <Input id="distancia-volta" inputMode="decimal" value={distanciaVolta} onChange={(e) => setDistanciaVolta(e.target.value)} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-4 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">Memória de cálculo</p>
                    {porTurno ? (
                      <>
                        <p className="mt-2 text-muted-foreground">
                          Turno {turno.rotulo} ({turno.horas}h): {formatarBRL(valorTurno)}
                        </p>
                        <p className="text-muted-foreground">
                          Franquia inclusa: {franquiaKm} km · rodados: {kmIda.toLocaleString("pt-BR")} km
                        </p>
                        <p className="text-muted-foreground">
                          Excedente: {kmExcedente.toLocaleString("pt-BR")} km × {formatarBRL(tarifa)} / km ={" "}
                          {formatarBRL(valorExcedente)}
                        </p>
                        <p className="font-display text-lg text-primary">{formatarBRL(valorDoTurno)}</p>
                      </>
                    ) : (
                      <>
                    <p className="mt-2 text-muted-foreground">
                      Ida: {kmIda.toLocaleString("pt-BR")} km × {formatarBRL(tarifa)} / km ={" "}
                      {formatarBRL(valorIda)}
                    </p>
                    {idaEVolta && (
                      <>
                        <p className="text-muted-foreground">
                          Volta: {kmVolta.toLocaleString("pt-BR")} km × {formatarBRL(tarifa)} / km ={" "}
                          {formatarBRL(valorVolta)}
                        </p>
                        <p className="text-success">
                          Desconto pacote ida e volta (15%): −{formatarBRL(descontoKm)}
                        </p>
                      </>
                    )}
                    <p className="text-muted-foreground">
                      Espera: {minutosEspera} min × {formatarBRL(VALOR_ESPERA_POR_MINUTO)} ={" "}
                      {formatarBRL(valorEspera)}
                    </p>
                    <p className="font-display text-lg text-primary">
                      {formatarBRL(valorTrajeto + valorEspera)}
                    </p>
                      </>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Piso mínimo do sistema: {formatarBRL(VALOR_MINIMO_POR_KM)} por km. Cada parada tem{" "}
                      {TOLERANCIA_ESPERA_MIN} minutos de cortesia.
                    </p>
                  </div>

                </div>

                <h2 className="mt-6 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Forma de pagamento
                </h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {(["Pix", "Cartão de crédito", "Plano mensal"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPagamento(p)}
                      className={cn(
                        "rounded-lg border px-4 py-3 text-sm transition-colors",
                        pagamento === p
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="surface-luxe border-border/60 p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Resumo da reserva</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ida</p>
                <p>{dataIda ? `${dataLonga(dataIda)} às ${horaIda}` : "Selecione a data"}</p>
              </div>
              {tipo === "Ida e retorno" && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Retorno</p>
                  <p>{dataRetorno ? `${dataLonga(dataRetorno)} às ${horaRetorno}` : "Selecione a data"}</p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Modalidade</p>
                <p>{modalidade.nome}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Motorista</p>
                <p>
                  {escolhido.nome} ({escolhido.nota} ★)
                </p>
                <p className="text-xs text-muted-foreground">
                  {escolhido.veiculo} · {capacidadeDaCategoria(escolhido.categoria)} ocupantes
                </p>
              </div>
              {etapa === 2 && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Trajeto de ida</p>
                    <p className="text-xs text-muted-foreground">Embarque: {embarque || "—"}</p>
                    {paradas
                      .filter((p) => p.endereco.trim())
                      .map((p) => (
                        <p key={p.id} className="text-xs text-muted-foreground">
                          Parada: {p.endereco} · espera {p.espera} min
                        </p>
                      ))}
                    <p className="text-xs text-muted-foreground">Destino: {desembarque || "—"}</p>
                  </div>
                  {idaEVolta && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Trajeto de volta</p>
                      <p className="text-xs text-muted-foreground">Embarque: {embarqueVoltaEfetivo || "—"}</p>
                      {paradasVolta
                        .filter((p) => p.endereco.trim())
                        .map((p) => (
                          <p key={p.id} className="text-xs text-muted-foreground">
                            Parada: {p.endereco} · espera {p.espera} min
                          </p>
                        ))}
                      <p className="text-xs text-muted-foreground">Destino: {desembarqueVoltaEfetivo || "—"}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 space-y-1 border-t border-border/70 pt-4 text-sm">
              {porTurno ? (
                <>
                  <p className="flex justify-between text-muted-foreground">
                    <span>
                      Turno {turno.rotulo} ({turno.inicio}–{turno.fim})
                    </span>
                    <span className="text-foreground">{formatarBRL(valorTurno)}</span>
                  </p>
                  <p className="flex justify-between text-muted-foreground">
                    <span>Excedente de km ({kmExcedente.toLocaleString("pt-BR")} km)</span>
                    <span className="text-foreground">{formatarBRL(valorExcedente)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Franquia de {franquiaKm} km inclusa e espera dentro do turno sem custo extra.
                  </p>
                </>
              ) : (
                <>
              <p className="flex justify-between text-muted-foreground">
                <span>
                  {modoPreco === "zona"
                    ? `Transfer ida (${transfer.zone_name})`
                    : `Ida (${kmIda.toLocaleString("pt-BR")} km)`}
                </span>
                <span className="text-foreground">
                  {formatarBRL(modoPreco === "zona" ? transfer.fare_ida : valorIda)}
                </span>
              </p>
              {idaEVolta && (
                <p className="flex justify-between text-muted-foreground">
                  <span>
                    {modoPreco === "zona"
                      ? `Transfer volta (${transfer.zone_name_retorno})`
                      : `Volta (${kmVolta.toLocaleString("pt-BR")} km)`}
                  </span>
                  <span className="text-foreground">
                    {formatarBRL(modoPreco === "zona" ? transfer.fare_retorno : valorVolta)}
                  </span>
                </p>
              )}
              {desconto > 0 && (
                <p className="flex justify-between text-muted-foreground">
                  <span>Desconto ida e volta (15%)</span>
                  <span className="text-success">−{formatarBRL(desconto)}</span>
                </p>
              )}
              {modoPreco === "zona" && transfer.night_surcharge > 0 && (
                <p className="flex justify-between text-muted-foreground">
                  <span>Adicional noturno (15%)</span>
                  <span className="text-warning">+{formatarBRL(transfer.night_surcharge)}</span>
                </p>
              )}
              <p className="flex justify-between text-muted-foreground">
                <span>Espera nas paradas ({minutosEspera} min)</span>
                <span className="text-foreground">{formatarBRL(valorEspera)}</span>
              </p>
                </>
              )}
              {ajudantesEfetivos > 0 && (
                <p className="flex justify-between text-muted-foreground">
                  <span>
                    Ajudantes ({ajudantesEfetivos} × {formatarBRL(escolhido.valorAjudante)})
                  </span>
                  <span className="text-foreground">{formatarBRL(valorAjudantes)}</span>
                </p>
              )}
              <p className="flex justify-between text-muted-foreground">
                <span>Taxa de serviço</span>
                <span className="text-foreground">{formatarBRL(TAXA_SERVICO)}</span>
              </p>

              <p className="flex justify-between border-t border-border/70 pt-2 text-muted-foreground">
                <span>Total</span>
                <span className="font-display text-base text-primary">{formatarBRL(total)}</span>
              </p>
            </div>

            <div className="mt-4 flex gap-2 rounded-lg border border-border/60 bg-secondary/30 p-3">
              <ShieldCheck className="size-4 shrink-0 text-success" />
              <p className="text-xs text-muted-foreground">
                Pagamento em custódia: o valor só é repassado ao motorista após a conclusão do trajeto com o seu
                código de 4 dígitos.
              </p>
            </div>

            {etapa === 1 ? (
              <Button className="mt-5 w-full" onClick={avancar}>
                Continuar para o trajeto <ArrowRight />
              </Button>
            ) : (
              <div className="mt-5 space-y-2">
                <Button className="w-full" onClick={confirmar}>
                  Ir para pagamento <ArrowRight />
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setEtapa(1)}>
                  <ArrowLeft /> Voltar à agenda
                </Button>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
