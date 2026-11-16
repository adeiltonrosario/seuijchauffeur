import { describe, expect, it } from "vitest";
import { linkGoogleAgenda, paraDataGoogle } from "./google-agenda";
describe("google agenda", () => {
  it("converte data com duração", () => {
    expect(paraDataGoogle("16/11/2026 09:30", 60)).toBe("20261116T103000");
  });
  it("convida a agenda da empresa", () => {
    const l = linkGoogleAgenda({ codigo: "AG-1", ida: "16/11/2026 09:30", embarque: "A", destino: "B" })!;
    expect(new URL(l).searchParams.get("add")).toBe("seuchauffeur.operacoes@gmail.com");
  });
});
