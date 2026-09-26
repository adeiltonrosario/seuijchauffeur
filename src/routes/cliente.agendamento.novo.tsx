import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, MapPin, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CAPACIDADE_PADRAO,
  TOLERANCIA_ESPERA_MIN,
  VALOR_ESPERA_POR_MINUTO,
  VALOR_MINIMO_POR_KM,
  calcularValorCorrida,
  calcularValorEspera,
  formatarBRL,
  minutosCobradosEspera,
  modalidades,
  motoristas,
} from "@/lib/dados";


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

  // Etapa 2
  const [embarque, setEmbarque] = useState("Av. Paulista, 1400 — Bela Vista, São Paulo");
  const [paradas, setParadas] = useState<{ id: number; endereco: string; espera: number }[]>([
    { id: 1, endereco: "Rua Augusta, 900 — Consolação", espera: TOLERANCIA_ESPERA_MIN },
  ]);

  const [desembarque, setDesembarque] = useState("Aeroporto de Congonhas — Portão 2");
  const [instrucoes, setInstrucoes] = useState("");
  const [distancia, setDistancia] = useState("20.5");
  const [pagamento, setPagamento] = useState<"Pix" | "Cartão de crédito" | "Plano mensal">("Pix");

  const escolhido = motoristas.find((m) => m.nome === motorista)!;
  const km = Math.max(Number(distancia.replace(",", ".")) || 0, 0);
  const tarifa = Math.max(modalidade.valorPorKm, VALOR_MINIMO_POR_KM);
  const valorTrajeto = useMemo(() => calcularValorCorrida(km, tarifa), [km, tarifa]);
  const minutosEspera = useMemo(
    () => paradas.reduce((t, p) => t + minutosCobradosEspera(p.espera), 0),
    [paradas],
  );
  const valorEspera = useMemo(
    () => calcularValorEspera(paradas.map((p) => p.espera)),
    [paradas],
  );
  const total = valorTrajeto + valorEspera + TAXA_SERVICO;


  const avancar = () => {
    if (!dataIda) {
      toast.error("Escolha a data da ida no calendário.");
      return;
    }
    if (tipo === "Ida e retorno" && !dataRetorno) {
      toast.error("Escolha também a data de retorno.");
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
    toast.success(`Agendamento enviado a ${motorista}. Total ${formatarBRL(total)}.`);
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
                  </div>

                  {tipo === "Ida e retorno" && (
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
                      onClick={() => setModalidade(m)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition-colors",
                        modalidade.nome === m.nome
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m.nome} · {formatarBRL(Math.max(m.valorPorKm, VALOR_MINIMO_POR_KM))}/km
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    Características e procedimentos
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{modalidade.caracteristicas}</p>
                </div>
              </Card>

              <Card className="border-border/60 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Motoristas disponíveis {dataIda ? `para ${dataIda.toLocaleDateString("pt-BR")} às ${horaIda}` : ""}
                </h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {motoristas.map((m) => (
                    <li key={m.nome}>
                      <button
                        type="button"
                        onClick={() => setMotorista(m.nome)}
                        className={cn(
                          "w-full rounded-lg border p-4 text-left transition-colors",
                          motorista === m.nome ? "border-primary/50 bg-primary/10" : "border-border/70",
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
                          Capacidade: {CAPACIDADE_PADRAO} passageiros
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          ) : (
            <>
              <Card className="border-border/60 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Pontos do percurso
                </h2>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="embarque">Embarque (origem)</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-success" />
                      <Input
                        id="embarque"
                        value={embarque}
                        onChange={(e) => setEmbarque(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {paradas.map((p, i) => (
                    <div key={p.id} className="space-y-2">
                      <Label htmlFor={`parada-${p.id}`}>Parada {i + 1} (opcional)</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-warning" />
                          <Input
                            id={`parada-${p.id}`}
                            value={p.endereco}
                            onChange={(e) =>
                              setParadas((atual) =>
                                atual.map((x) => (x.id === p.id ? { ...x, endereco: e.target.value } : x)),
                              )
                            }
                            className="pl-9"
                          />
                        </div>
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
                        <Label htmlFor={`espera-${p.id}`} className="flex items-center gap-2 text-xs">
                          <Clock className="size-3.5 text-primary" /> Tempo de espera nesta parada (minutos)
                        </Label>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {[3, 10, 15, 30].map((min) => (
                            <button
                              key={min}
                              type="button"
                              onClick={() =>
                                setParadas((atual) =>
                                  atual.map((x) => (x.id === p.id ? { ...x, espera: min } : x)),
                                )
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
                            id={`espera-${p.id}`}
                            inputMode="numeric"
                            value={String(p.espera)}
                            onChange={(e) =>
                              setParadas((atual) =>
                                atual.map((x) =>
                                  x.id === p.id
                                    ? { ...x, espera: Math.max(0, Number(e.target.value) || 0) }
                                    : x,
                                ),
                              )
                            }
                            className="h-8 w-20"
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {TOLERANCIA_ESPERA_MIN} minutos de cortesia; depois{" "}
                          {formatarBRL(VALOR_ESPERA_POR_MINUTO)} por minuto. Cobrança desta parada:{" "}
                          <span className="text-primary">
                            {minutosCobradosEspera(p.espera)} min ={" "}
                            {formatarBRL(calcularValorEspera([p.espera]))}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setParadas((atual) => [
                        ...atual,
                        { id: Date.now(), endereco: "", espera: TOLERANCIA_ESPERA_MIN },
                      ])
                    }
                  >

                    <Plus /> Adicionar outra parada
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="desembarque">Desembarque (destino)</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-destructive" />
                      <Input
                        id="desembarque"
                        value={desembarque}
                        onChange={(e) => setDesembarque(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instrucoes">Instruções de acesso ao motorista</Label>
                    <Input
                      id="instrucoes"
                      value={instrucoes}
                      onChange={(e) => setInstrucoes(e.target.value)}
                      placeholder="Ex.: aguardar na portaria social, interfone 102."
                    />
                  </div>
                </div>
              </Card>

              <Card className="border-border/60 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Distância e cálculo do valor
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="distancia">Distância estimada do trajeto (km)</Label>
                    <Input
                      id="distancia"
                      inputMode="decimal"
                      value={distancia}
                      onChange={(e) => setDistancia(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Soma de todos os trechos, incluindo as paradas.
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-4 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">Memória de cálculo</p>
                    <p className="mt-2 text-muted-foreground">
                      {km.toLocaleString("pt-BR")} km × {formatarBRL(tarifa)} / km ={" "}
                      {formatarBRL(valorTrajeto)}
                    </p>
                    <p className="text-muted-foreground">
                      Espera: {minutosEspera} min × {formatarBRL(VALOR_ESPERA_POR_MINUTO)} ={" "}
                      {formatarBRL(valorEspera)}
                    </p>
                    <p className="font-display text-lg text-primary">
                      {formatarBRL(valorTrajeto + valorEspera)}
                    </p>
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
                  {escolhido.veiculo} · {CAPACIDADE_PADRAO} passageiros
                </p>
              </div>
              {etapa === 2 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Trajeto</p>
                  <p className="text-xs text-muted-foreground">Embarque: {embarque || "—"}</p>
                  {paradas
                    .filter((p) => p.endereco.trim())
                    .map((p) => (
                      <p key={p.id} className="text-xs text-muted-foreground">
                        Parada: {p.endereco}
                      </p>
                    ))}
                  <p className="text-xs text-muted-foreground">Destino: {desembarque || "—"}</p>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-1 border-t border-border/70 pt-4 text-sm">
              <p className="flex justify-between text-muted-foreground">
                <span>Trajeto ({km.toLocaleString("pt-BR")} km)</span>
                <span className="text-foreground">{formatarBRL(valorTrajeto)}</span>
              </p>
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
