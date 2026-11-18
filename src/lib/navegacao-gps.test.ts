import { describe, expect, it } from "vitest";
import { coordenadasDeLink, enderecoDeLink, linkWaze } from "./navegacao-gps";

describe("navegação GPS", () => {
  it("lê coordenadas de link do Google Maps", () => {
    expect(coordenadasDeLink("https://www.google.com/maps/place/X/@-12.9711,-38.5108,17z")).toEqual([-12.9711, -38.5108]);
  });
  it("lê coordenadas coladas", () => {
    expect(coordenadasDeLink("-12.9, -38.4")).toEqual([-12.9, -38.4]);
  });
  it("lê nome do local no link", () => {
    expect(enderecoDeLink("https://www.google.com/maps/place/Farol+da+Barra/@-13,-38,1z")).toBe("Farol da Barra");
  });
  it("Waze abre navegação", () => {
    expect(linkWaze("Pituba")).toContain("navigate=yes");
  });
});
