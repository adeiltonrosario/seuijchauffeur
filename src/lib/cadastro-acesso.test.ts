import { describe, expect, it } from "vitest";
import { cpfValido, validarSenhas } from "./cadastro-acesso";

describe("cadastro de acesso", () => {
  it("recusa senhas diferentes", () => {
    expect(validarSenhas("segredo123", "segredo124")).toMatch(/não coincidem/);
  });
  it("aceita senhas iguais com 8+ caracteres", () => {
    expect(validarSenhas("segredo123", "segredo123")).toBeNull();
  });
  it("valida CPF", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("111.111.111-11")).toBe(false);
  });
});
