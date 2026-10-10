import { describe, expect, it } from "vitest";
import { calcularTranslado } from "./casa-apoio";

const p = (paciente: string, hospital: string, municipio = "Lauro de Freitas", acompanhante = "", extensao = false) => ({ paciente, acompanhante, hospital, municipio, extensao });

describe("translado casas de apoio", () => {
  it("cobra R$ 90 por paciente, com ou sem acompanhante", () => {
    const r = calcularTranslado([p("João", "HC", "Lauro de Freitas", "Maria"), p("Francisco", "HC")], { ar: false, capacidade: 4 });
    expect(r.total).toBe(180);
  });
  it("hospital diferente no mesmo município soma R$ 2", () => {
    expect(calcularTranslado([p("A", "HC"), p("B", "Outro")], { ar: false, capacidade: 4 }).total).toBe(182);
  });
  it("ar-condicionado soma R$ 15", () => {
    expect(calcularTranslado([p("A", "HC")], { ar: true, capacidade: 4 }).total).toBe(105);
  });
  it("outro município bloqueia carro comum sem extensão", () => {
    expect(calcularTranslado([p("A", "HC"), p("B", "X", "Candeias")], { ar: false, capacidade: 4 }).bloqueios.length).toBe(1);
  });
  it("extensão Candeias vale R$ 120 e libera", () => {
    const r = calcularTranslado([p("A", "HC"), p("B", "X", "Candeias", "", true)], { ar: false, capacidade: 4 });
    expect(r.bloqueios.length).toBe(0);
    expect(r.total).toBe(210);
  });
  it("minivan libera outro município", () => {
    expect(calcularTranslado([p("A", "HC"), p("B", "X", "Candeias")], { ar: false, capacidade: 7 }).bloqueios.length).toBe(0);
  });
});
