import { describe, it, expect } from "vitest";
import { openDb } from "../src/store/db";
import { saveDraft } from "../src/store/drafts";

describe("saveDraft", () => {
  it("lưu draft + items + observations trong 1 transaction", () => {
    const db = openDb(":memory:");
    const id = saveDraft(db, {
      supplierName: "NCC A",
      rawJson: '{"x":1}',
      items: [
        { rawName: "Coca", matchedProductId: 1, quantity: 10, unit: "lon", costPrice: 8000, expiryDate: null },
        { rawName: "Hàng lạ", matchedProductId: null, quantity: 5, unit: "cái", costPrice: 3000, expiryDate: "2027-01-01" },
      ],
      observations: [
        {
          productId: 1,
          rawName: "Coca",
          observedCostPrice: 8000,
          previousCostPrice: 7000,
          pctChange: 14.29,
          sellPrice: 12000,
          oldMargin: 0.4167,
          newMargin: 0.3333,
        },
      ],
    });

    expect(id).toBeGreaterThan(0);

    const draft = db.prepare("SELECT * FROM draft_invoices WHERE id = ?").get(id) as Record<string, unknown>;
    expect(draft.supplier_name).toBe("NCC A");
    expect(draft.status).toBe("draft");

    const items = db.prepare("SELECT * FROM draft_invoice_items WHERE draft_id = ?").all(id);
    expect(items).toHaveLength(2);

    const obs = db.prepare("SELECT * FROM price_observations").all();
    expect(obs).toHaveLength(1);
  });
});
