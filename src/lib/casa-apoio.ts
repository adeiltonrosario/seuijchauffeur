export const VALOR_POR_PACIENTE = 90;
export const TAXA_HOSPITAL_DIFERENTE = 2;
export const TAXA_AR_CONDICIONADO = 15;
/** Valor por paciente quando o destino fica em outro município (extensão intermunicipal). */
export const EXTENSAO_MUNICIPIO: Record<string, number> = {
  "Lauro de Freitas": 90,
  "Simões Filho": 100,
  "Camaçari": 115,
  "Candeias": 120,
  "Dias d'Ávila": 130,
};
export const MUNICIPIOS_RMS = ["Salvador", ...Object.keys(EXTENSAO_MUNICIPIO)];

export type PacienteTranslado = {
  paciente: string;
  acompanhante: string;
  hospital: string;
  municipio: string;
  /** Destino em outro município, aguardando aceite do motorista. */
  extensao?: boolean;
  /** 2º turno no mesmo dia (mesmo paciente, sem novo assento): hospital 1 → hospital 2. */
  turno2?: boolean;
  horario2?: string;
  hospital2?: string;
  municipio2?: string;
};

export type ResultadoTranslado = {
  itens: { descricao: string; valor: number }[];
  total: number;
  ocupantes: number;
  bloqueios: string[];
};

export function calcularTranslado(
  pacientes: PacienteTranslado[],
  opts: { ar: boolean; capacidade: number },
): ResultadoTranslado {
  const itens: ResultadoTranslado["itens"] = [];
  const bloqueios: string[] = [];
  const validos = pacientes.filter((p) => p.paciente.trim());
  const primeiro = validos[0];
  let ocupantes = 0;
  validos.forEach((p, i) => {
    ocupantes += p.acompanhante.trim() ? 2 : 1;
    const outroMunicipio = primeiro && p.municipio !== primeiro.municipio;
    if (outroMunicipio) {
      if (opts.capacidade <= 5 && !p.extensao) {
        bloqueios.push(
          `${p.paciente}: trajeto divergente do primeiro (município diferente). Use Minivan/Van ou marque como extensão opcional para o motorista aceitar.`,
        );
      }
      const v = EXTENSAO_MUNICIPIO[p.municipio] ?? VALOR_POR_PACIENTE;
      itens.push({ descricao: `${p.paciente} — extensão ${p.municipio}`, valor: v });
      return;
    }
    itens.push({ descricao: `${p.paciente}${p.acompanhante.trim() ? ` + ${p.acompanhante}` : ""}`, valor: VALOR_POR_PACIENTE });
    if (i > 0 && primeiro && p.hospital.trim().toLowerCase() !== primeiro.hospital.trim().toLowerCase()) {
      itens.push({ descricao: `Parada em hospital diferente (${p.hospital})`, valor: TAXA_HOSPITAL_DIFERENTE });
    }
    if (p.turno2 && p.hospital2?.trim()) {
      itens.push({ descricao: `2º turno ${p.horario2 || ""} — ${p.paciente} → ${p.hospital2}`.replace("  ", " "), valor: TAXA_HOSPITAL_DIFERENTE });
    }
  });
  if (ocupantes > opts.capacidade) bloqueios.push(`Ocupantes (${ocupantes}) acima da capacidade do veículo (${opts.capacidade}).`);
  if (opts.ar && validos.length) itens.push({ descricao: "Ar-condicionado", valor: TAXA_AR_CONDICIONADO });
  const total = Math.round(itens.reduce((s, x) => s + x.valor, 0) * 100) / 100;
  return { itens, total, ocupantes, bloqueios };
}
