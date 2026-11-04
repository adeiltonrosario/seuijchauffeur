import { describe, expect, it } from "vitest";
import { calcularEsportivo, recomendarVeiculos } from "./translado-esportivo";

describe("translado esportivo", () => {
  it("carro para até 4 pessoas", () => expect(recomendarVeiculos(4).veiculo).toBe("carro"));
  it("minivan para 5 a 7", () => expect(recomendarVeiculos(6).veiculo).toBe("minivan"));
  it("van para 10+; 25 pessoas usam 2 vans", () => expect(recomendarVeiculos(25)).toEqual({ veiculo: "van", quantidade: 2 }));
  it("por km cobra R$ 2,20/km", () => expect(calcularEsportivo({ cobranca: "km", veiculo: "van", quantidade: 1, km: 10 }).total).toBe(22));
  it("franquia debita saldo e cobra só excedente", () => {
    const r = calcularEsportivo({ cobranca: "franquia", veiculo: "van", quantidade: 1, km: 50, saldoFranquiaKm: 40 });
    expect(r.kmConsumidos).toBe(40);
    expect(r.total).toBe(22);
  });
});
