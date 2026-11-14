import { describe, expect, it } from "vitest";
import { extrairCnh, extrairCrlv } from "./leitura-documentos";

describe("leitura de documentos", () => {
  it("extrai nome, CPF e registro da CNH", () => {
    const d = extrairCnh("NOME JOAO DA SILVA SANTOS DOC. IDENTIDADE 123 CPF 123.456.789-09 Nº REGISTRO 01234567890");
    expect(d).toEqual({ nome: "JOAO DA SILVA SANTOS", cpf: "123.456.789-09", registro: "01234567890" });
  });
  it("extrai placa, marca, modelo, cor e lotação do CRLV", () => {
    const d = extrairCrlv("PLACA ABC1D23 MARCA / MODELO / VERSÃO TOYOTA / COROLLA XEI 2.0 ESPÉCIE / TIPO PASSAGEIRO COR PREDOMINANTE PRETA LOTAÇÃO 5");
    expect(d).toEqual({ placa: "ABC1D23", marca: "Toyota", modelo: "COROLLA XEI 2.0", cor: "Preta", lotacao: 5 });
  });
});
