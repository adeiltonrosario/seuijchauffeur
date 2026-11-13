import { describe, expect, it } from "vitest";
import { aplicarTaxaInterdiaria, voltaEmOutroDia, haConflito, modalidadeLivre, valorFinal, valorModalidade } from "./orcamento-livre";

describe("orçamento livre", () => {
  it("bloqueia Casa de Apoio e Clube/Esportivo", () => {
    expect(modalidadeLivre("Translado Casas de Apoio")).toBe(false);
    expect(modalidadeLivre("Translado Esportivo")).toBe(false);
    expect(modalidadeLivre("Executivo aeroporto")).toBe(true);
  });
  it("conflita mesmo dia e horário com frota de 1 motorista", () => {
    expect(haConflito("05/11/2026 14:30", ["05/11/2026 14:30"], 1)).toBe(true);
    expect(haConflito("05/11/2026 17:00", ["05/11/2026 14:30"], 1)).toBe(false);
    expect(haConflito("06/11/2026 14:30", ["05/11/2026 14:30"], 1)).toBe(false);
  });
  it("respeita o piso de R$ 1,85/km", () => {
    const m = { nome: "x", caracteristicas: "", por_km: 1, por_turno: false, valor_turno: 0, franquia_km: 0 };
    expect(valorModalidade(m, 10)).toBe(18.5);
  });
  it("ida e volta dobra os km e Pix dá 10% de desconto", () => {
    const m = { nome: "x", caracteristicas: "", por_km: 2.2, por_turno: false, valor_turno: 0, franquia_km: 0 };
    expect(valorFinal(m, 10, false, "Cartão")).toBe(22);
    expect(valorFinal(m, 10, true, "Cartão")).toBe(44);
    expect(valorFinal(m, 10, true, "Pix")).toBe(39.6);
  });
  it("taxa de deslocamento só quando a volta é em outro dia", () => {
    expect(voltaEmOutroDia("14/11/2026 20:00", "15/11/2026 02:00")).toBe(true);
    expect(voltaEmOutroDia("14/11/2026 20:00", "14/11/2026 23:30")).toBe(false);
    expect(aplicarTaxaInterdiaria(100, 30)).toBe(130);
  });
});

import { aplicarAdicionalOcupantes } from "./orcamento-livre";
describe("adicional por ocupante", () => {
  it("titular incluso, cobra a partir do 2º", () => {
    expect(aplicarAdicionalOcupantes(100, 1, 10)).toBe(100);
    expect(aplicarAdicionalOcupantes(100, 3, 10)).toBe(120);
  });
});
