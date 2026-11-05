import { describe, expect, it } from "vitest";
import { valorPersonalizado, vencimento } from "./pacotes";

describe("pacotes de créditos", () => {
  it("personalizado: 100 km a R$ 2,20 = R$ 220,00", () => {
    expect(valorPersonalizado(100, 2.2)).toBe(220);
  });
  it("diário vence em 24h e semanal em 7 dias", () => {
    const b = new Date("2026-11-05T10:00:00Z");
    expect(vencimento("diario", b).toISOString()).toBe("2026-11-06T10:00:00.000Z");
    expect(vencimento("semanal", b).toISOString()).toBe("2026-11-12T10:00:00.000Z");
    expect(vencimento("quinzenal", b).toISOString()).toBe("2026-11-20T10:00:00.000Z");
  });
});
