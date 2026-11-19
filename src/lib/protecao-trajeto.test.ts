import { describe, expect, it } from "vitest";
import { bloqueioTrajeto, ehIntermunicipal, kmCobrados, valorVip } from "./orcamento-livre";

const vip = { nome: "VIPS & SHOWS", caracteristicas: "", por_km: 7, por_turno: false, valor_turno: 0, franquia_km: 0 };

describe("proteções de trajeto", () => {
  it("bloqueia Executivo Aeroporto sem aeroporto na rota", () => {
    expect(bloqueioTrajeto("Executivo aeroporto", ["Pituba, Salvador", "Costa do Sauípe"])).not.toBeNull();
    expect(bloqueioTrajeto("Executivo aeroporto", ["Graça", "Aeroporto de Salvador"])).toBeNull();
  });
  it("Costa do Sauípe e rotas acima de 45 km são intermunicipais", () => {
    expect(ehIntermunicipal(["Pituba", "Costa do Sauípe"], 30)).toBe(true);
    expect(ehIntermunicipal(["Pituba", "Barra"], 46)).toBe(true);
    expect(ehIntermunicipal(["Pituba", "Barra"], 10)).toBe(false);
  });
  it("só ida em estrada cobra 50% dos km de retorno", () => {
    expect(kmCobrados(100, false, true)).toBe(150);
    expect(kmCobrados(100, true, true)).toBe(200);
    expect(kmCobrados(10, false, false)).toBe(10);
  });
  it("VIP pontual tem piso de R$ 220", () => {
    expect(valorVip(vip, 20, false)).toBe(220);
  });
  it("VIP turno: R$ 480 com 50 km inclusos e excedente por km", () => {
    expect(valorVip(vip, 50, true)).toBe(480);
    expect(valorVip(vip, 60, true)).toBe(550);
  });
});
