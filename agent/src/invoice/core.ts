import { matchProduct, type MatchResult, type ProductLite } from "./match.js";
import { computePriceAlert, type PriceAlert } from "./pricing.js";
import type { DraftItemToSave, DraftToSave, PriceObservationToSave } from "../store/drafts.js";

export interface InvoiceItemInput {
  name: string;
  quantity: number;
  unit: string;
  costPrice: number;
  expiryDate: string | null;
}

export interface InvoiceInput {
  supplierName: string;
  items: InvoiceItemInput[];
}

export interface BatchLite {
  cost_price: number;
  received_at: string;
}

/** Dependencies tiêm vào — production dùng taphoa API + SQLite, test dùng đồ giả. */
export interface InvoiceDeps {
  listProducts(): Promise<ProductLite[]>;
  listBatches(productId: number): Promise<BatchLite[]>;
  saveDraft(draft: DraftToSave): number;
}

function vnd(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

function pct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

/** Trong các lô đang còn, lấy lô nhập GẦN NHẤT (received_at lớn nhất). */
export function pickLatestBatch(batches: BatchLite[]): BatchLite | null {
  if (batches.length === 0) return null;
  return batches.reduce((a, b) => (new Date(b.received_at) > new Date(a.received_at) ? b : a));
}

function formatMatchedLine(it: InvoiceItemInput, productName: string, alert: PriceAlert): string {
  let line = `✅ ${it.name} → "${productName}": ${it.quantity} ${it.unit} @ ${vnd(it.costPrice)}`;
  if (alert.pctChange === null) {
    line += " (lần đầu có giá vốn, chưa so sánh được)";
  } else if (alert.direction === "up") {
    line += ` — ⬆️ giá vốn TĂNG ${pct(alert.pctChange)} (trước: ${vnd(alert.previousCost!)})`;
  } else if (alert.direction === "down") {
    line += ` — ⬇️ giá vốn GIẢM ${pct(alert.pctChange)} (trước: ${vnd(alert.previousCost!)})`;
  } else {
    line += " — giá vốn không đổi";
  }
  if (alert.newMargin !== null) {
    const oldM = alert.oldMargin !== null ? `${(alert.oldMargin * 100).toFixed(0)}%→` : "";
    line += `. Biên LN: ${oldM}${(alert.newMargin * 100).toFixed(0)}%`;
  }
  return line;
}

function formatUnmatchedLine(it: InvoiceItemInput, m: MatchResult): string {
  if (m.status === "ambiguous") {
    const names = m.candidates.map((c) => `"${c.name}"`).join(" hoặc ");
    return `❓ ${it.name}: KHỚP NHIỀU sản phẩm (${names}) — cần bạn chọn, chưa so giá.`;
  }
  const hint = m.candidates.length ? ` (gần nhất: "${m.candidates[0].name}")` : "";
  return `🆕 ${it.name}: CHƯA khớp sản phẩm nào${hint} — có thể là hàng mới.`;
}

export async function processInvoice(input: InvoiceInput, deps: InvoiceDeps): Promise<string> {
  const products = await deps.listProducts();

  const items: DraftItemToSave[] = [];
  const observations: PriceObservationToSave[] = [];
  const lines: string[] = [];

  for (const it of input.items) {
    const m = matchProduct(it.name, products);

    if (m.status === "matched" && m.productId !== null) {
      const batches = await deps.listBatches(m.productId);
      const latest = pickLatestBatch(batches);
      const previousCost = latest ? latest.cost_price : null;
      const alert = computePriceAlert({ sellPrice: m.sellPrice, previousCost, newCost: it.costPrice });

      items.push({
        rawName: it.name,
        matchedProductId: m.productId,
        quantity: it.quantity,
        unit: it.unit,
        costPrice: it.costPrice,
        expiryDate: it.expiryDate,
      });
      observations.push({
        productId: m.productId,
        rawName: it.name,
        observedCostPrice: it.costPrice,
        previousCostPrice: previousCost,
        pctChange: alert.pctChange,
        sellPrice: m.sellPrice,
        oldMargin: alert.oldMargin,
        newMargin: alert.newMargin,
      });
      lines.push(formatMatchedLine(it, m.productName!, alert));
    } else {
      // ambiguous / unmatched: vẫn lưu item (matchedProductId null), không so giá.
      items.push({
        rawName: it.name,
        matchedProductId: null,
        quantity: it.quantity,
        unit: it.unit,
        costPrice: it.costPrice,
        expiryDate: it.expiryDate,
      });
      observations.push({
        productId: null,
        rawName: it.name,
        observedCostPrice: it.costPrice,
        previousCostPrice: null,
        pctChange: null,
        sellPrice: null,
        oldMargin: null,
        newMargin: null,
      });
      lines.push(formatUnmatchedLine(it, m));
    }
  }

  const draftId = deps.saveDraft({
    supplierName: input.supplierName,
    rawJson: JSON.stringify(input),
    items,
    observations,
  });

  const header = `📋 Đã lưu NHÁP đơn nhập #${draftId} từ NCC "${input.supplierName}" (${input.items.length} mặt hàng):`;
  return [header, ...lines, "", "⚠️ Đây là bản NHÁP để bạn kiểm tra — agent CHƯA ghi vào kho thật."].join("\n");
}
