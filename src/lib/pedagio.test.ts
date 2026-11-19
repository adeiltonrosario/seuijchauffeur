import { describe, expect, it } from "vitest";
import { pedagioTotal, rotuloDiasPedagio } from "./orcamento-livre";

describe("pedágios da rodovia", () => {
  it("domingo 22/11 + quarta 25/11 = R$ 64", () => expect(pedagioTotal(true, "22/11/2026 09:00", "25/11/2026 15:00")).toBe(64));
  it("só ida no domingo = R$ 44", () => expect(pedagioTotal(true, "22/11/2026 09:00", null)).toBe(44));
  it("dia útil mesmo dia = R$ 20", () => expect(pedagioTotal(true, "25/11/2026 09:00", "25/11/2026 18:00")).toBe(20));
  it("urbano não cobra", () => expect(pedagioTotal(false, "22/11/2026 09:00", null)).toBe(0));
  it("rótulo", () => expect(rotuloDiasPedagio("22/11/2026 09:00", "25/11/2026 15:00")).toBe("Domingo + Quarta"));
});
