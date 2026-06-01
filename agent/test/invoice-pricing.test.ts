import { describe, it, expect } from "vitest";
import { computePriceAlert } from "../src/invoice/pricing";

describe("computePriceAlert", () => {
  it("giá vốn tăng → direction up + pctChange + 2 biên LN", () => {
    const a = computePriceAlert({ sellPrice: 15000, previousCost: 10000, newCost: 12000 });
    expect(a.direction).toBe("up");
    expect(a.pctChange).toBeCloseTo(20);
    expect(a.oldMargin).toBeCloseTo((15000 - 10000) / 15000);
    expect(a.newMargin).toBeCloseTo((15000 - 12000) / 15000);
  });

  it("không có giá vốn cũ → pctChange null, direction unknown, vẫn tính newMargin", () => {
    const a = computePriceAlert({ sellPrice: 15000, previousCost: null, newCost: 12000 });
    expect(a.pctChange).toBeNull();
    expect(a.direction).toBe("unknown");
    expect(a.oldMargin).toBeNull();
    expect(a.newMargin).toBeCloseTo(0.2);
  });

  it("giá cũ = 0 → không chia 0 (pctChange null)", () => {
    const a = computePriceAlert({ sellPrice: 15000, previousCost: 0, newCost: 12000 });
    expect(a.pctChange).toBeNull();
  });

  it("chưa match (sellPrice null) → 2 biên LN đều null", () => {
    const a = computePriceAlert({ sellPrice: null, previousCost: 10000, newCost: 12000 });
    expect(a.oldMargin).toBeNull();
    expect(a.newMargin).toBeNull();
  });
});
