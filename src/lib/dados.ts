export const CAPACIDADE_PADRAO = 4;

/** Categorias de veículos de passageiros. */
export const CATEGORIAS_PASSAGEIROS = ["Sedan", "SUV", "Utilitário Esportivo", "Hatch", "Minivan executiva", "Van executiva"] as const;

/** Categorias de veículos utilitários de carga (carretos e mudanças). */
export const CATEGORIAS_CARGA = [
  "Fiorino / Furgão leve",
  "Picape / Caçamba aberta",
  "Van de carga / Furgão médio",
  "Caminhão VUC / Baú 3/4",
] as const;

export const CATEGORIAS = [...CATEGORIAS_PASSAGEIROS, ...CATEGORIAS_CARGA] as const;

export type CategoriaVeiculo = (typeof CATEGORIAS)[number];

export const ehCategoriaCarga = (categoria: string) =>
  (CATEGORIAS_CARGA as readonly string[]).includes(categoria);

/** Capacidade de ocupantes por categoria (utilitários levam menos gente e mais carga). */
export const capacidadeDaCategoria = (categoria: string) => {
  switch (categoria) {
    case "Minivan executiva":
      return 6;
    case "Utilitário Esportivo":
      return 5;
    case "Van executiva":
      return 10;
    case "Fiorino / Furgão leve":
    case "Picape / Caçamba aberta":
      return 2;
    case "Van de carga / Furgão médio":
    case "Caminhão VUC / Baú 3/4":
      return 3;
    default:
      return CAPACIDADE_PADRAO;
  }
};

/** Faixa de lotação permitida no cadastro de cada categoria. */
export const faixaCapacidade = (categoria: string): { min: number; max: number; ajustavel: boolean } => {
  switch (categoria) {
    case "Minivan executiva":
      return { min: 5, max: 7, ajustavel: true };
    case "Utilitário Esportivo":
      return { min: 5, max: 6, ajustavel: true };
    case "Van executiva":
      return { min: 10, max: 30, ajustavel: true };
    default: {
      const fixa = capacidadeDaCategoria(categoria);
      return { min: fixa, max: fixa, ajustavel: false };
    }
  }
};

/** Garante que a lotação informada respeite a faixa da categoria. */
export const capacidadeValida = (categoria: string, valor: number) => {
  const { min, max } = faixaCapacidade(categoria);
  if (!Number.isFinite(valor)) return min;
  return Math.min(max, Math.max(min, Math.round(valor)));
};

/** Texto de apoio sobre a lotação exigida no cadastro. */
export const ajudaCapacidade = (categoria: string) => {
  switch (categoria) {
    case "Minivan executiva":
      return "Escolha a lotação do veículo: 5, 6 ou 7 ocupantes.";
    case "Utilitário Esportivo":
      return "Escolha a lotação do veículo: 5 ou 6 ocupantes, conforme o CRLV.";
    case "Van executiva":
      return "Informe a lotação homologada no CRLV do veículo (mínimo 10 ocupantes, ex.: 10, 12, 15, 18 ou 20).";
    default:
      return "";
  }
};

/** Capacidade de carga informativa de cada utilitário. */
export const cargaDaCategoria = (categoria: string) => {
  switch (categoria) {
    case "Fiorino / Furgão leve":
      return "até 650 kg · 3 m³ — eletrodomésticos avulsos (geladeira, fogão, TV)";
    case "Picape / Caçamba aberta":
      return "até 700 kg · carroceria aberta — entregas rápidas e volumes soltos";
    case "Van de carga / Furgão médio":
      return "até 1.500 kg · 10 a 14 m³ — móveis desmontados e pequenas mudanças";
    case "Caminhão VUC / Baú 3/4":
      return "até 3.000 kg · baú amplo — mudança residencial completa";
    default:
      return "";
  }
};

/** Taxa de referência da plataforma por ajudante de carga (o motorista pode definir a sua). */
export const TAXA_AJUDANTE_PADRAO = 60;
export const MAX_AJUDANTES = 2;

export type StatusAgendamento = "pendente" | "confirmado" | "em-andamento" | "concluido" | "cancelado";

export const rotuloStatus: Record<StatusAgendamento, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  "em-andamento": "Em andamento",
  concluido: "Concluída",
  cancelado: "Cancelado",
};

export type Agendamento = {
  id: string;
  cliente: string;
  motorista: string;
  embarque: string;
  parada?: string;
  desembarque: string;
  ida: string;
  retorno?: string;
  modalidade: string;
  pagamento: "Pix" | "Cartão de crédito" | "Plano mensal";
  valor: number;
  status: StatusAgendamento;
  veiculo: string;
  categoria: CategoriaVeiculo;
  ocupantes: string[];
  capacidade: number;
  /** Telefone com WhatsApp do cliente, para avisos com mensagem pronta. */
  whatsappCliente?: string;
};

export const agendamentos: Agendamento[] = [
  {
    id: "AG-1042",
    cliente: "Adeilton Oliveira",
    motorista: "Marcos Vinícius",
    embarque: "Av. Paulista, 1400 — São Paulo",
    parada: "Rua Augusta, 900",
    desembarque: "Aeroporto de Congonhas",
    ida: "22/09/2026 07:30",
    retorno: "22/09/2026 21:15",
    modalidade: "Executivo aeroporto",
    pagamento: "Pix",
    valor: 320,
    status: "confirmado",
    veiculo: "Toyota Corolla — Preto",
    categoria: "Sedan",
    ocupantes: ["Adeilton Oliveira", "Carla Menezes"],
    capacidade: CAPACIDADE_PADRAO,
    whatsappCliente: "(71) 99680-5321",
  },
  {
    id: "AG-1043",
    cliente: "Renata Prado",
    motorista: "Juliana Alves",
    embarque: "Rua Oscar Freire, 233",
    desembarque: "Hospital Albert Einstein",
    ida: "23/09/2026 09:00",
    modalidade: "Corrida assistida",
    pagamento: "Plano mensal",
    valor: 180,
    status: "pendente",
    veiculo: "Jeep Compass — Cinza",
    categoria: "SUV",
    ocupantes: ["Renata Prado"],
    capacidade: CAPACIDADE_PADRAO,
  },
  {
    id: "AG-1044",
    cliente: "Eduardo Lima",
    motorista: "Marcos Vinícius",
    embarque: "Alameda Santos, 45",
    parada: "Av. Faria Lima, 3500",
    desembarque: "Aeroporto de Guarulhos",
    ida: "24/09/2026 05:40",
    retorno: "26/09/2026 23:10",
    modalidade: "Viagem corporativa",
    pagamento: "Cartão de crédito",
    valor: 540,
    status: "em-andamento",
    veiculo: "Toyota Corolla — Preto",
    categoria: "Sedan",
    ocupantes: ["Eduardo Lima", "Paulo Braga", "Tiago Reis"],
    capacidade: CAPACIDADE_PADRAO,
  },
  {
    id: "AG-1045",
    cliente: "Sofia Andrade",
    motorista: "Rafael Costa",
    embarque: "Rua Haddock Lobo, 120",
    desembarque: "Shopping Iguatemi",
    ida: "20/09/2026 18:00",
    modalidade: "City tour",
    pagamento: "Pix",
    valor: 140,
    status: "concluido",
    veiculo: "Honda Fit — Branco",
    categoria: "Hatch",
    ocupantes: ["Sofia Andrade"],
    capacidade: CAPACIDADE_PADRAO,
  },
];

export type Motorista = {
  nome: string;
  /** Contato obrigatório do motorista. */
  email: string;
  /** Telefone com WhatsApp, obrigatório. */
  whatsapp: string;
  nota: number;
  veiculo: string;
  placa: string;
  valor: number;
  favorito: boolean;
  categoria: CategoriaVeiculo;
  /** Quantos ajudantes de carga o motorista disponibiliza (0 = não oferece). */
  ajudantes: number;
  /** Valor por ajudante definido livremente pelo motorista. */
  valorAjudante: number;
};

export const motoristas: Motorista[] = [
  { nome: "Marcos Vinícius", email: "marcos.vinicius@seuchauffeur.com.br", whatsapp: "(71) 99680-5321", nota: 4.9, veiculo: "Toyota Corolla — Sedan", placa: "FQR-4E21", valor: 320, favorito: true, categoria: "Sedan", ajudantes: 0, valorAjudante: 0 },
  { nome: "Juliana Alves", email: "juliana.alves@seuchauffeur.com.br", whatsapp: "(71) 99712-4408", nota: 4.8, veiculo: "Jeep Compass — SUV", placa: "GHT-9J04", valor: 365, favorito: true, categoria: "SUV", ajudantes: 0, valorAjudante: 0 },
  { nome: "Rafael Costa", email: "rafael.costa@seuchauffeur.com.br", whatsapp: "(71) 99345-7712", nota: 4.7, veiculo: "Honda Fit — Hatch", placa: "KLM-2B77", valor: 280, favorito: false, categoria: "Hatch", ajudantes: 0, valorAjudante: 0 },
  { nome: "Camila Duarte", email: "camila.duarte@seuchauffeur.com.br", whatsapp: "(71) 99488-2290", nota: 5.0, veiculo: "Volvo XC60 — SUV", placa: "RPA-7C55", valor: 420, favorito: false, categoria: "SUV", ajudantes: 0, valorAjudante: 0 },
  {
    nome: "Wagner Teixeira",
    email: "wagner.teixeira@seuchauffeur.com.br",
    whatsapp: "(71) 99551-6034",
    nota: 4.8,
    veiculo: "Fiat Fiorino Furgão — Fiorino / Furgão leve",
    placa: "TRK-5H19",
    valor: 240,
    favorito: false,
    categoria: "Fiorino / Furgão leve",
    ajudantes: 2,
    valorAjudante: 80,
  },
  {
    nome: "Cleber Nunes",
    email: "cleber.nunes@seuchauffeur.com.br",
    whatsapp: "(71) 99620-8817",
    nota: 4.9,
    veiculo: "Hyundai HR Baú — Caminhão VUC / Baú 3/4",
    placa: "VUC-8D30",
    valor: 390,
    favorito: false,
    categoria: "Caminhão VUC / Baú 3/4",
    ajudantes: 2,
    valorAjudante: 70,
  },
];


export const VALOR_MINIMO_POR_KM = 1.85;
export const TARIFA_PADRAO_POR_KM = 3;
export const TOLERANCIA_ESPERA_MIN = 3;
export const VALOR_ESPERA_POR_MINUTO = 0.5;

/** Turno de acompanhamento (usado pela modalidade de compras em supermercado). */
export type Turno = {
  id: "manha" | "tarde" | "noite";
  rotulo: string;
  inicio: string;
  fim: string;
  horas: number;
  resumo: string;
};

export const TURNOS_COMPRAS: Turno[] = [
  {
    id: "manha",
    rotulo: "Manhã",
    inicio: "08:00",
    fim: "12:00",
    horas: 4,
    resumo: "Feira matinal e hipermercados com movimento tranquilo.",
  },
  {
    id: "tarde",
    rotulo: "Tarde",
    inicio: "14:00",
    fim: "18:00",
    horas: 4,
    resumo: "Compras do mês, atacadistas e centros de compras.",
  },
  {
    id: "noite",
    rotulo: "Noite",
    inicio: "19:00",
    fim: "22:00",
    horas: 3,
    resumo: "Compras expressas após o expediente.",
  },
];

export type Modalidade = {
  nome: string;
  caracteristicas: string;
  valorPorKm: number;
  /** Valor de referência de uma viagem avulsa desta modalidade (base do cálculo dos planos). */
  precoAvulso: number;
  /** "passageiros" (padrão) ou "carga" para carretos e mudanças. */
  tipo?: "passageiros" | "carga";
  /** Categorias de veículo que podem atender esta modalidade. */
  categoriasPermitidas?: CategoriaVeiculo[];
  /** Permite contratar ajudantes de carga junto com o motorista. */
  permiteAjudantes?: boolean;
  /** Atendimento cobrado por turno fechado, e não por corrida isolada. */
  porTurno?: boolean;
  /** Valor fixo do turno fechado. */
  valorTurno?: number;
  /** Quilometragem inclusa no turno (ida e volta somadas). */
  franquiaKm?: number;
};

export const precoAvulsoDaModalidade = (nome: string) =>
  modalidades.find((m) => m.nome === nome)?.precoAvulso ?? 150;

/** Categorias aceitas pela modalidade — passageiros por padrão. */
export const categoriasDaModalidade = (m: Modalidade): readonly CategoriaVeiculo[] =>
  m.categoriasPermitidas && m.categoriasPermitidas.length > 0
    ? m.categoriasPermitidas
    : CATEGORIAS_PASSAGEIROS;

export const ehModalidadeDeCarga = (m: Modalidade) => m.tipo === "carga";

export const ehModalidadePorTurno = (m: Modalidade) => m.porTurno === true;

/** Valor do km que passar da franquia inclusa no turno. */
export const calcularExcedenteFranquia = (
  kmTotal: number,
  franquiaKm: number,
  valorPorKm: number = TARIFA_PADRAO_POR_KM,
) => {
  const excedente = Math.max(0, (Number.isFinite(kmTotal) ? kmTotal : 0) - franquiaKm);
  return Math.round(excedente * Math.max(valorPorKm, VALOR_MINIMO_POR_KM) * 100) / 100;
};

export const calcularValorCorrida = (distanciaKm: number, valorPorKm: number) => {
  const tarifa = Math.max(valorPorKm, VALOR_MINIMO_POR_KM);
  return Math.round(distanciaKm * tarifa * 100) / 100;
};

/** Minutos cobrados em uma parada, descontada a tolerância gratuita. */
export const minutosCobradosEspera = (
  minutos: number,
  tolerancia: number = TOLERANCIA_ESPERA_MIN,
) => Math.max(0, (Number.isFinite(minutos) ? minutos : 0) - tolerancia);

/** Valor total do tempo de espera das paradas intermediárias. */
export const calcularValorEspera = (
  minutosPorParada: number[],
  valorPorMinuto: number = VALOR_ESPERA_POR_MINUTO,
  tolerancia: number = TOLERANCIA_ESPERA_MIN,
) => {
  const minutos = minutosPorParada.reduce(
    (total, m) => total + minutosCobradosEspera(m, tolerancia),
    0,
  );
  return Math.round(minutos * valorPorMinuto * 100) / 100;
};


export const modalidades: Modalidade[] = [
  {
    nome: "Translado Casas de Apoio",
    valorPorKm: 3,
    precoAvulso: 90,
    caracteristicas:
      "Embarque fixo na Casa de Apoio cadastrada. Cobrança por paciente (com ou sem acompanhante), + R$ 2,00 por hospital diferente no mesmo município, ar-condicionado opcional + R$ 15,00. Acesso liberado pelo administrador.",
  },
  {
    nome: "Executivo aeroporto",
    valorPorKm: 3.5,
    precoAvulso: 150,
    caracteristicas:
      "Embarque: motorista aguarda na portaria 10 minutos antes do horário, confirma o nome do cliente e acomoda as bagagens no porta-malas. Desembarque: parar na área de embarque da companhia aérea, entregar as bagagens ao cliente e confirmar o voo antes de liberar o veículo. Inclui água, carregador e monitoramento do voo.",
  },
  {
    nome: "Corrida assistida",
    valorPorKm: 3.2,
    precoAvulso: 120,
    caracteristicas:
      "Embarque: motorista desce do veículo, auxilia o cliente com apoio de braço e ajusta o cinto quando solicitado. Desembarque: acompanhar o cliente até a recepção do destino e aguardar a confirmação de entrada. Indicado para consultas médicas e passageiros com mobilidade reduzida.",
  },
  {
    nome: "Viagem corporativa",
    valorPorKm: 3,
    precoAvulso: 160,
    caracteristicas:
      "Embarque: pontualidade rigorosa, traje social e conferência da lista de passageiros da empresa. Desembarque: emitir recibo da corrida e registrar centro de custo. Silêncio a bordo por padrão; conversas apenas se iniciadas pelo cliente.",
  },
  {
    nome: "City tour",
    valorPorKm: 2.8,
    precoAvulso: 220,
    caracteristicas:
      "Embarque: alinhar com o cliente a ordem dos pontos de visita e o tempo de parada em cada um. Desembarque: em cada parada o motorista informa o horário de retorno ao veículo e aguarda no ponto combinado. Roteiro pode ser ajustado durante o trajeto.",
  },
  {
    nome: "Escolar recorrente",
    valorPorKm: 1.85,
    precoAvulso: 80,
    caracteristicas:
      "Embarque: identificar o responsável, conferir o nome do aluno e checar o cinto antes de sair. Desembarque: entregar o aluno somente ao responsável cadastrado ou à equipe da escola, com confirmação no aplicativo. Rota fixa e horários repetidos nos dias úteis.",
  },
  {
    nome: "Rota de plantonista",
    valorPorKm: 3.1,
    precoAvulso: 140,
    caracteristicas:
      "Para médicos, enfermeiros, policiais e demais profissionais de escala. Embarque: o motorista chega 10 minutos antes no ponto de acesso indicado (portaria do corpo clínico, entrada da emergência, batalhão ou recepção) para não atrasar a passagem de plantão. Conexão entre plantões: cada trecho tem horário próprio, com margem de trânsito entre as unidades. Retorno pós-plantão: viagem silenciosa e climatizada para descanso após 12h ou 24h de jornada. Confirmação de prontidão do motorista 45 minutos antes de cada trecho; sem confirmação até 30 minutos antes, a plataforma aciona automaticamente um motorista de backup e avisa o cliente.",
  },

  {
    nome: "Carreto e pequenas mudanças",
    valorPorKm: 3.4,
    precoAvulso: 190,
    tipo: "carga",
    categoriasPermitidas: [...CATEGORIAS_CARGA],
    permiteAjudantes: true,
    caracteristicas:
      "Coleta: o motorista confere a lista de itens informada pelo cliente, avalia a integridade de móveis e eletrodomésticos, protege com cobertores e amarra a carga com cintas antes de sair. O cliente deve indicar se há escadas ou elevador de serviço. Entrega: descarregamento no local combinado, conferência item por item na presença do cliente e montagem básica somente se contratados ajudantes. Itens frágeis (TV, vidros, mármore) viajam em pé e protegidos; o motorista não transporta produtos inflamáveis, animais ou cargas sem nota quando exigida.",
  },

  {
    nome: "Compras & Supermercado (por turno)",
    valorPorKm: 3,
    precoAvulso: 160,
    porTurno: true,
    valorTurno: 160,
    franquiaKm: 20,
    caracteristicas:
      "Atendimento fechado por turno (manhã 08h-12h, tarde 14h-18h ou noite 19h-22h) com R$ 160 por turno e 20 km inclusos na ida e na volta somadas; o km que passar da franquia é cobrado à tarifa padrão. Embarque: o motorista chega 10 minutos antes na residência com o porta-malas limpo e desimpedido, auxilia o cliente no embarque e na acomodação. No supermercado: estaciona no ponto mais conveniente, acompanha o cliente dentro da loja, conduz o carrinho, alcança produtos em prateleiras altas e acomoda fardos e volumes pesados. Retorno e desembarque: apoio completo no descarregamento, levando todas as sacolas, caixas e volumes até o hall, portaria ou entrada da residência.",
  },
];

export const caracteristicasDaModalidade = (nome: string) =>
  modalidades.find((m) => m.nome === nome)?.caracteristicas ??
  "Procedimentos de embarque e desembarque a combinar com o motorista antes da corrida.";


export const planos = [
  { nome: "Essencial", preco: "R$ 289/mês", corridas: "8 corridas urbanas", destaque: false },
  { nome: "Executivo", preco: "R$ 649/mês", corridas: "20 corridas + aeroporto", destaque: true },
  { nome: "Corporativo", preco: "R$ 1.290/mês", corridas: "Ilimitado para equipes", destaque: false },
];

export const participantesMapa = [
  { id: "m1", nome: "Marcos Vinícius", tipo: "motorista" as const, x: 26, y: 32, agendamento: "AG-1042" },
  { id: "m2", nome: "Juliana Alves", tipo: "motorista" as const, x: 64, y: 22, agendamento: "AG-1043" },
  { id: "m3", nome: "Rafael Costa", tipo: "motorista" as const, x: 45, y: 70, agendamento: "AG-1045" },
  { id: "c1", nome: "Adeilton Oliveira", tipo: "cliente" as const, x: 38, y: 48, agendamento: "AG-1042" },
  { id: "c2", nome: "Renata Prado", tipo: "cliente" as const, x: 76, y: 56, agendamento: "AG-1043" },
  { id: "c3", nome: "Eduardo Lima", tipo: "cliente" as const, x: 18, y: 66, agendamento: "AG-1044" },
];

export type Veiculo = {
  placa: string;
  modelo: string;
  cor: string;
  categoria: CategoriaVeiculo;
  capacidade: number;
};

export const veiculos: Veiculo[] = [
  { placa: "FQR-4E21", modelo: "Toyota Corolla", cor: "Preto", categoria: "Sedan", capacidade: capacidadeDaCategoria("Sedan") },
  { placa: "GHT-9J04", modelo: "Jeep Compass", cor: "Cinza", categoria: "SUV", capacidade: capacidadeDaCategoria("SUV") },
  { placa: "KLM-2B77", modelo: "Honda Fit", cor: "Branco", categoria: "Hatch", capacidade: capacidadeDaCategoria("Hatch") },
  {
    placa: "TRK-5H19",
    modelo: "Fiat Fiorino Furgão",
    cor: "Branco",
    categoria: "Fiorino / Furgão leve",
    capacidade: capacidadeDaCategoria("Fiorino / Furgão leve"),
  },
  {
    placa: "VUC-8D30",
    modelo: "Hyundai HR Baú",
    cor: "Branco",
    categoria: "Caminhão VUC / Baú 3/4",
    capacidade: capacidadeDaCategoria("Caminhão VUC / Baú 3/4"),
  },
];

export const conversas = [
  {
    id: "cv-1",
    cliente: "Adeilton Oliveira",
    motorista: "Marcos Vinícius",
    agendamento: "AG-1042",
    assunto: "Motorista a caminho",
    naoLidas: 2,
  },
  {
    id: "cv-2",
    cliente: "Renata Prado",
    motorista: "Juliana Alves",
    agendamento: "AG-1043",
    assunto: "Confirmação de horário",
    naoLidas: 0,
  },
  {
    id: "cv-3",
    cliente: "Eduardo Lima",
    motorista: "Marcos Vinícius",
    agendamento: "AG-1044",
    assunto: "Troca de veículo",
    naoLidas: 1,
  },
];

export const mensagensMediadas = [
  { autor: "motorista" as const, texto: "Estou saindo agora, chego em 12 minutos.", hora: "07:14" },
  { autor: "ia" as const, texto: "Olá! Seu motorista Marcos já está a caminho e chega em cerca de 12 minutos.", hora: "07:14" },
  { autor: "cliente" as const, texto: "Perfeito, já desço para a portaria.", hora: "07:15" },
  { autor: "ia" as const, texto: "O cliente aguardará na portaria do prédio.", hora: "07:15" },
];

export const padroesAtendimento = [
  "Sempre confirme nome do cliente, endereço de embarque e horário antes de repassar qualquer mensagem.",
  "Avisos de atraso devem incluir o novo horário estimado e o pedido de desculpas padrão.",
  "Troca de veículo só pode ser comunicada após aceitação do cliente.",
  "Nunca compartilhe telefone pessoal, dados de pagamento ou endereço residencial completo.",
  "Cancelamentos com menos de 2h devem oferecer reagendamento prioritário.",
];

export const formatarBRL = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
