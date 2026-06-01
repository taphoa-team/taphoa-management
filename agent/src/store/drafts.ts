import type { DB } from "./db.js";

export interface DraftItemToSave {
  rawName: string;
  matchedProductId: number | null;
  quantity: number;
  unit: string;
  costPrice: number;
  expiryDate: string | null;
}

export interface PriceObservationToSave {
  productId: number | null;
  rawName: string;
  observedCostPrice: number;
  previousCostPrice: number | null;
  pctChange: number | null;
  sellPrice: number | null;
  oldMargin: number | null;
  newMargin: number | null;
}

export interface DraftToSave {
  supplierName: string;
  rawJson: string;
  items: DraftItemToSave[];
  observations: PriceObservationToSave[];
}

/** Lưu 1 draft + items + observations trong 1 transaction. Trả về draftId. */
export function saveDraft(db: DB, draft: DraftToSave): number {
  const insertDraft = db.prepare(
    "INSERT INTO draft_invoices (supplier_name, raw_json) VALUES (?, ?)",
  );
  const insertItem = db.prepare(
    `INSERT INTO draft_invoice_items
       (draft_id, raw_name, matched_product_id, quantity, unit, cost_price, expiry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertObs = db.prepare(
    `INSERT INTO price_observations
       (product_id, raw_name, observed_cost_price, previous_cost_price, pct_change, sell_price, old_margin, new_margin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  // transaction: hoặc lưu hết, hoặc không lưu gì (tránh draft lưu nửa chừng).
  const tx = db.transaction((d: DraftToSave): number => {
    const draftId = Number(insertDraft.run(d.supplierName, d.rawJson).lastInsertRowid);
    for (const it of d.items) {
      insertItem.run(draftId, it.rawName, it.matchedProductId, it.quantity, it.unit, it.costPrice, it.expiryDate);
    }
    for (const o of d.observations) {
      insertObs.run(
        o.productId,
        o.rawName,
        o.observedCostPrice,
        o.previousCostPrice,
        o.pctChange,
        o.sellPrice,
        o.oldMargin,
        o.newMargin,
      );
    }
    return draftId;
  });

  return tx(draft);
}
