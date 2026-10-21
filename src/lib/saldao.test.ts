import { describe, expect, it } from "vitest";
import { descontoPercentual, erroQuantidade, minutosRestantes, valorCompra } from "./saldao";

describe("saldão", () => {
  it("20 créditos a R$ 0,70 custam R$ 14,00", () => {
    expect(valorCompra(20, 0.7)).toBe(14);
  });
  it("arredonda em centavos", () => {
    expect(valorCompra(3, 0.335)).toBe(1.01);
  });
  it("não deixa reservar mais que o disponível nem frações", () => {
    expect(erroQuantidade(51, 50)).not.toBeNull();
    expect(erroQuantidade(2.5, 50)).not.toBeNull();
    expect(erroQuantidade(0, 50)).not.toBeNull();
    expect(erroQuantidade(50, 50)).toBeNull();
  });
  it("R$ 0,70 por crédito é 30% abaixo da referência de R$ 1,00", () => {
    expect(descontoPercentual(0.7)).toBe(30);
    expect(descontoPercentual(1.2)).toBe(0);
  });
  it("reserva vencida mostra zero minutos", () => {
    const agora = new Date("2026-10-21T10:00:00Z");
    expect(minutosRestantes("2026-10-21T10:30:00Z", agora)).toBe(30);
    expect(minutosRestantes("2026-10-21T09:00:00Z", agora)).toBe(0);
  });
});
