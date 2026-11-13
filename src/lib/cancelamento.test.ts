import { describe, it, expect } from "vitest";
import { taxaCancelamento } from "./cancelamento";
describe("taxa de cancelamento", () => {
  it("retém 30% do valor pago", () => { expect(taxaCancelamento(200)).toBe(60); expect(taxaCancelamento(123.45)).toBe(37.04); });
});
