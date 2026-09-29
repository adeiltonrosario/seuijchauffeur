/**
 * RF-04 — Motor de precificação por zonas.
 * RF-05 — Comparativo financeiro com o estacionamento do aeroporto.
 * Notifier Engine — agendamento de alertas 24h e 2h antes do pickup.
 */

export type ModalidadeViagem = "SOMENTE_IDA" | "SOMENTE_VOLTA" | "IDA_E_VOLTA";

export const rotuloModalidadeViagem: Record<ModalidadeViagem, string> = {
  SOMENTE_IDA: "Somente ida",
  SOMENTE_VOLTA: "Somente volta",
  IDA_E_VOLTA: "Ida e volta",
};

export type Zona = {
  zone_id: number;
  nome: string;
  valor: number;
  /** Bairros de referência da zona. */
  bairros: string[];
  /** Prefixos de CEP (5 primeiros dígitos) atendidos pela zona. */
  cepPrefixos: string[];
};

export const ZONAS: Zona[] = [
  {
    zone_id: 1,
    nome: "Zona 1",
    valor: 70,
    bairros: ["bela vista", "jardins", "jardim paulista", "consolacao", "moema", "vila mariana", "itaim bibi", "centro"],
    cepPrefixos: ["01310", "01311", "01401", "01402", "04077", "04101", "04530"],
  },
  {
    zone_id: 2,
    nome: "Zona 2",
    valor: 115,
    bairros: ["pinheiros", "perdizes", "vila madalena", "morumbi", "brooklin", "campo belo", "higienopolis"],
    cepPrefixos: ["05422", "05014", "04571", "04629", "01238"],
  },
  {
    zone_id: 3,
    nome: "Zona 3",
    valor: 155,
    bairros: ["santana", "tatuape", "mooca", "lapa", "ipiranga", "santo amaro", "penha"],
    cepPrefixos: ["02011", "03080", "03104", "05075", "04263", "04752"],
  },
  {
    zone_id: 4,
    nome: "Zona 4",
    valor: 200,
    bairros: ["alphaville", "granja viana", "guarulhos", "sao bernardo", "osasco", "santo andre", "cotia", "barueri"],
    cepPrefixos: ["06454", "06709", "07010", "09710", "06010", "09040"],
  },
];

export const DIARIA_ESTACIONAMENTO = 90;
export const PERCENTUAL_DESCONTO_PACOTE = 0.15;
export const PERCENTUAL_ADICIONAL_NOTURNO = 0.15;
export const HORA_INICIO_NOTURNO = 23;
export const HORA_FIM_NOTURNO = 5;

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const centavos = (valor: number) => Math.round(valor * 100) / 100;

/** Identifica a zona a partir de um CEP ou nome de bairro presente no endereço. */
export const identificarZona = (origemOuDestino: string): Zona => {
  const texto = normalizar(origemOuDestino);
  const cep = texto.replace(/\D/g, "");

  if (cep.length >= 5) {
    const prefixo = cep.slice(0, 5);
    const porCep = ZONAS.find((z) => z.cepPrefixos.includes(prefixo));
    if (porCep) return porCep;
  }

  const porBairro = ZONAS.find((z) => z.bairros.some((b) => texto.includes(b)));
  return porBairro ?? ZONAS[0]!;
};

export const zonaPorId = (zone_id: number): Zona =>
  ZONAS.find((z) => z.zone_id === zone_id) ?? ZONAS[0]!;

/** Verifica se um horário "HH:MM" está na janela noturna (23:00 às 05:00). */
export const ehHorarioNoturno = (hora: string) => {
  const h = Number(String(hora).split(":")[0]);
  if (!Number.isFinite(h)) return false;
  return h >= HORA_INICIO_NOTURNO || h < HORA_FIM_NOTURNO;
};

export type CanalNotificacao = "PUSH_NOTIFICATION" | "WHATSAPP";

export type NotificacaoAgendada = {
  id: string;
  marco: "24h_antes" | "2h_antes";
  datetime: string;
  canal: CanalNotificacao;
  status: "AGENDADO" | "ENVIADO" | "CANCELADO";
  mensagem: string;
};

const dataHoraLonga = (d: Date) =>
  `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} às ${d.toLocaleTimeString(
    "pt-BR",
    { hour: "2-digit", minute: "2-digit" },
  )}`;

export const mensagemNotificacao = (pickup: Date) =>
  `Olá! Seu transfer executivo para o aeroporto está agendado para ${dataHoraLonga(pickup)}. ` +
  "Nosso motorista estará à sua disposição no local combinado com antecedência.";

/** Agenda os alertas automáticos 24h e 2h antes do pickup nos canais informados. */
export const agendarNotificacoes = (
  pickup: Date,
  canais: CanalNotificacao[] = ["PUSH_NOTIFICATION", "WHATSAPP"],
): NotificacaoAgendada[] => {
  const marcos: { marco: NotificacaoAgendada["marco"]; horas: number }[] = [
    { marco: "24h_antes", horas: 24 },
    { marco: "2h_antes", horas: 2 },
  ];
  const mensagem = mensagemNotificacao(pickup);

  return marcos.flatMap(({ marco, horas }) =>
    canais.map((canal) => ({
      id: `${marco}-${canal}`,
      marco,
      datetime: new Date(pickup.getTime() - horas * 60 * 60 * 1000).toISOString(),
      canal,
      status: "AGENDADO" as const,
      mensagem,
    })),
  );
};

export type EntradaPrecificacao = {
  origem: string;
  destino: string;
  modalidade: ModalidadeViagem;
  horaPartida: string;
  horaRetorno?: string;
  diasViagem: number;
  pickup?: Date;
  canais?: CanalNotificacao[];
  /** Permite fixar a zona manualmente, ignorando a detecção por CEP/bairro. */
  zonaManual?: number;
};

export type SaidaPrecificacao = {
  zone_id: number;
  zone_name: string;
  base_fare: number;
  night_surcharge: number;
  package_discount: number;
  final_trip_price: number;
  estimated_parking_cost: number;
  customer_savings: number;
  comparison_message: string;
  scheduled_notifications: NotificacaoAgendada[];
};

export const mensagemComparativo = (
  diasViagem: number,
  custoEstacionamento: number,
  precoTransfer: number,
  economia: number,
) => {
  const brl = (v: number) => v.toFixed(2).replace(".", ",");
  return (
    `Estacionamento por ${diasViagem} ${diasViagem === 1 ? "dia" : "dias"}: R$ ${brl(custoEstacionamento)} | ` +
    `Seu Transfer: R$ ${brl(precoTransfer)}. Você economiza R$ ${brl(economia)}!`
  );
};

/** Calcula o transfer executivo completo (RF-04 + RF-05 + notificações). */
export const calcularTransferZonas = (entrada: EntradaPrecificacao): SaidaPrecificacao => {
  const zona =
    entrada.zonaManual != null
      ? zonaPorId(entrada.zonaManual)
      : identificarZona(`${entrada.origem} ${entrada.destino}`);

  const idaEVolta = entrada.modalidade === "IDA_E_VOLTA";
  const trechos = idaEVolta ? 2 : 1;

  // Valor bruto dos trechos, antes do desconto de pacote.
  const base_fare = centavos(zona.valor * trechos);

  // Desconto de 15% sobre a soma dos dois trechos no pacote ida e volta.
  const package_discount = idaEVolta ? centavos(base_fare * PERCENTUAL_DESCONTO_PACOTE) : 0;
  const valorComDesconto = centavos(base_fare - package_discount);

  // Adicional noturno de 15% sobre o valor do trecho correspondente.
  const valorTrechoLiquido = centavos(valorComDesconto / trechos);
  let night_surcharge = 0;
  if (ehHorarioNoturno(entrada.horaPartida)) {
    night_surcharge += valorTrechoLiquido * PERCENTUAL_ADICIONAL_NOTURNO;
  }
  const horaVolta = entrada.modalidade === "SOMENTE_VOLTA" ? entrada.horaPartida : entrada.horaRetorno;
  if (idaEVolta && horaVolta && ehHorarioNoturno(horaVolta)) {
    night_surcharge += valorTrechoLiquido * PERCENTUAL_ADICIONAL_NOTURNO;
  }
  night_surcharge = centavos(night_surcharge);

  const final_trip_price = centavos(valorComDesconto + night_surcharge);

  const diasViagem = Math.max(1, Math.floor(entrada.diasViagem || 1));
  const estimated_parking_cost = centavos(diasViagem * DIARIA_ESTACIONAMENTO);
  const customer_savings = centavos(estimated_parking_cost - final_trip_price);

  return {
    zone_id: zona.zone_id,
    zone_name: zona.nome,
    base_fare,
    night_surcharge,
    package_discount,
    final_trip_price,
    estimated_parking_cost,
    customer_savings,
    comparison_message: mensagemComparativo(
      diasViagem,
      estimated_parking_cost,
      final_trip_price,
      customer_savings,
    ),
    scheduled_notifications: entrada.pickup
      ? agendarNotificacoes(entrada.pickup, entrada.canais)
      : [],
  };
};
