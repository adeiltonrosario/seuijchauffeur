import { describe, expect, it } from "vitest";
import { valorComIndicacao } from "./indicacao-preco";

describe("valorComIndicacao", () => {
  it("amigo indicado ganha 10% na 1ª mensalidade", () => {
    expect(valorComIndicacao({ valorTotalCiclo: 513, valorMensal: 513, descontoTitularPct: 0, usaCodigoAmigo: true }).total).toBe(461.7);
  });
  it("titular com 2 indicações tem 10% na mensalidade", () => {
    expect(valorComIndicacao({ valorTotalCiclo: 500, valorMensal: 500, descontoTitularPct: 10, usaCodigoAmigo: false }).total).toBe(450);
  });
  it("desconto do titular tem teto de 20%", () => {
    expect(valorComIndicacao({ valorTotalCiclo: 100, valorMensal: 100, descontoTitularPct: 35, usaCodigoAmigo: false }).total).toBe(80);
  });
});
