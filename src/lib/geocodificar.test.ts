import { describe, expect, it } from "vitest";
import { variacoesEndereco } from "./geocodificar";

describe("variacoesEndereco", () => {
  it("remove CEP, expande R. e inclui a variação Rua + Cidade", () => {
    const v = variacoesEndereco("R. João Marques Oliveira, 53 - Buraquinho, Lauro de Freitas - BA, 42710-170");
    expect(v[0]).toBe("Rua João Marques Oliveira, 53, Buraquinho, Lauro de Freitas, BA");
    expect(v).toContain("Rua João Marques Oliveira, Lauro de Freitas, BA");
    expect(v.join(" ")).not.toContain("42710");
  });
});
