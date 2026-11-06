import { describe, expect, it } from "vitest";
import { bonusPercentual, debitarCorrida, valorPersonalizado, vencimento } from "./pacotes";

describe("pacotes de créditos", () => {
  it("personalizado: 100 km a R$ 2,20 = R$ 220,00", () => {
    expect(valorPersonalizado(100, 2.2)).toBe(220);
  });
  it("paga R$ 250 e ganha R$ 280: bônus de 12%", () => {
    expect(bonusPercentual(250, 280)).toBe(12);
  });
  it("corrida de R$ 60 com saldo R$ 100 debita R$ 60 do saldo", () => {
    expect(debitarCorrida(60, 100)).toEqual({ usado: 60, pagarPix: 0, saldoApos: 40 });
  });
  it("corrida de R$ 48,50 com saldo R$ 30 cobra R$ 18,50 no Pix", () => {
    expect(debitarCorrida(48.5, 30)).toEqual({ usado: 30, pagarPix: 18.5, saldoApos: 0 });
  });
  it("diário vence em 24h e semanal em 7 dias", () => {
    const b = new Date("2026-11-05T10:00:00Z");
    expect(vencimento("diario", b).toISOString()).toBe("2026-11-06T10:00:00.000Z");
    expect(vencimento("semanal", b).toISOString()).toBe("2026-11-12T10:00:00.000Z");
    expect(vencimento("quinzenal", b).toISOString()).toBe("2026-11-20T10:00:00.000Z");
  });
});
