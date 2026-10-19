import { describe, expect, it } from "vitest";
import { creditosViagem, ordemConsumo, simularCofre, type Lote } from "./creditos";

describe("créditos", () => {
  it("2 créditos por km, somando o deslocamento até o embarque", () => {
    expect(creditosViagem(3, 10)).toBe(26);
  });
  it("exemplo do PRD: transferir 40 de 100 deixa 59 na carteira? não — 60 e 39 no cofre, taxa 1", () => {
    expect(simularCofre(40, 100)).toEqual({ carteira: 60, cofre: 39, taxa: 1 });
  });
  it("não transfere mais que o disponível nem só a taxa", () => {
    expect(simularCofre(101, 100)).toBeNull();
    expect(simularCofre(1, 100)).toBeNull();
  });
  it("consome carteira antes do cofre e o vencimento mais próximo primeiro", () => {
    const l = (id: string, local: Lote["local"], dias: number): Lote => ({
      id, local, saldo: 10, status: "ativo", concedido_em: "2026-01-01", vence_em: new Date(Date.now() + dias * 864e5).toISOString(),
    });
    const ids = ordemConsumo([l("cofre", "cofre", 1), l("tarde", "carteira", 30), l("cedo", "carteira", 5), l("vencido", "carteira", -1)]).map((x) => x.id);
    expect(ids).toEqual(["cedo", "tarde", "cofre"]);
  });
});
