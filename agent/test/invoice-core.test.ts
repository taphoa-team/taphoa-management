import { describe, it, expect } from "vitest";
import { processInvoice, type InvoiceDeps } from "../src/invoice/core";
import type { DraftToSave } from "../src/store/drafts";

const products = [
  { id: 1, name: "Coca Cola lon 330ml", sell_price: 12000, unit: "lon" },
  { id: 2, name: "Mì Hảo Hảo tôm chua cay", sell_price: 4000, unit: "gói" },
];

function makeDeps(overrides: Partial<InvoiceDeps> = {}) {
  let saved: DraftToSave | null = null;
  const deps: InvoiceDeps = {
    listProducts: async () => products,
    listBatches: async (id) => (id === 1 ? [{ cost_price: 8000, received_at: "2026-05-01" }] : []),
    saveDraft: (d) => {
      saved = d;
      return 7;
    },
    ...overrides,
  };
  return { deps, getSaved: () => saved };
}

describe("processInvoice", () => {
  it("item khớp + có giá vốn cũ → tóm tắt báo % thay đổi + lưu nháp", async () => {
    const { deps, getSaved } = makeDeps();
    const summary = await processInvoice(
      { supplierName: "NCC A", items: [{ name: "Coca", quantity: 10, unit: "lon", costPrice: 9000, expiryDate: null }] },
      deps,
    );

    expect(summary).toContain("#7");
    expect(summary).toContain("Coca Cola lon 330ml");
    expect(summary).toContain("TĂNG"); // 8000 -> 9000 = +12.5%
    expect(summary).toContain("NHÁP");

    const saved = getSaved()!;
    expect(saved.items[0].matchedProductId).toBe(1);
    expect(saved.observations[0].pctChange).toBeCloseTo(12.5);
  });

  it("item khớp nhưng chưa có lô nào → báo 'lần đầu có giá vốn'", async () => {
    const { deps } = makeDeps();
    const summary = await processInvoice(
      { supplierName: "NCC A", items: [{ name: "Mì Hảo Hảo", quantity: 30, unit: "gói", costPrice: 3000, expiryDate: null }] },
      deps,
    );
    expect(summary).toContain("lần đầu");
  });

  it("item không khớp → đánh dấu hàng mới, lưu với matchedProductId null", async () => {
    const { deps, getSaved } = makeDeps();
    const summary = await processInvoice(
      { supplierName: "NCC A", items: [{ name: "Bánh quy bơ", quantity: 5, unit: "hộp", costPrice: 20000, expiryDate: null }] },
      deps,
    );
    expect(summary).toContain("CHƯA khớp");
    expect(getSaved()!.items[0].matchedProductId).toBeNull();
  });
});
