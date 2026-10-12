import { describe, expect, it } from "vitest";
import { calcularCobertura } from "./carteira-km";

describe("cobertura da carteira de km", () => {
  it("saldo suficiente: 18,5 km com 50 km paga R$ 0 e sobra 31,5 km", () => {
    const c = calcularCobertura(18.5, 50);
    expect(c.total).toBe(0);
    expect(c.saldoApos).toBe(31.5);
  });
  it("saldo parcial: 18,5 km com 10 km cobra 8,5 km × R$3 + R$8 = R$ 33,50", () => {
    const c = calcularCobertura(18.5, 10);
    expect(c.excedente).toBe(8.5);
    expect(c.total).toBe(33.5);
    expect(c.saldoApos).toBe(0);
  });
  it("saldo nunca fica negativo", () => {
    expect(calcularCobertura(40, 0).saldoApos).toBe(0);
  });
});
