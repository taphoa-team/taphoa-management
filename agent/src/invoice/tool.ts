import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { taphoa } from "../taphoa/client.js";
import { db } from "../store/db.js";
import { saveDraft } from "../store/drafts.js";
import { processInvoice, type BatchLite, type InvoiceDeps } from "./core.js";
import type { ProductLite } from "./match.js";

/** /products có phân trang (limit tối đa 100) → lặp tới khi hết để lấy toàn bộ catalog. */
async function listAllProducts(): Promise<ProductLite[]> {
  const all: ProductLite[] = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await taphoa.get<ProductLite[]>("/products", { page, limit: 100 });
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

const deps: InvoiceDeps = {
  listProducts: listAllProducts,
  // LƯU Ý: /batches chỉ trả lô còn hàng (quantity > 0). Nếu SP đã bán hết sạch,
  // endpoint trả [] → previousCost = null → KHÔNG chắc là chưa từng nhập bao giờ.
  listBatches: (productId) => taphoa.get<BatchLite[]>(`/products/${productId}/batches`),
  saveDraft: (draft) => saveDraft(db, draft),
};

export const recordPurchaseInvoice = tool(
  async (input) => processInvoice(input, deps),
  {
    name: "record_purchase_invoice",
    description:
      "Ghi nhận HÓA ĐƠN NHẬP HÀNG từ ẢNH. Khi người dùng GỬI ẢNH hóa đơn/phiếu nhập hàng, hãy ĐỌC ảnh rồi trích xuất: tên nhà cung cấp + từng mặt hàng (tên, số lượng, đơn vị, GIÁ NHẬP cho 1 đơn vị, hạn dùng nếu có) và gọi tool này. Tool sẽ tự đối chiếu với sản phẩm trong cửa hàng, CẢNH BÁO nếu giá nhập thay đổi so với lần trước, rồi lưu BẢN NHÁP. Tool KHÔNG ghi vào kho thật.",
    schema: z.object({
      supplierName: z.string().describe("Tên nhà cung cấp ghi trên hóa đơn. Không rõ thì để 'Không rõ'."),
      items: z
        .array(
          z.object({
            name: z.string().describe("Tên mặt hàng đọc trên hóa đơn"),
            quantity: z.number().describe("Số lượng nhập"),
            unit: z.string().describe("Đơn vị: lon, chai, thùng, gói, kg..."),
            costPrice: z
              .number()
              .describe("GIÁ NHẬP cho 1 đơn vị (VND, số nguyên). Nếu hóa đơn ghi thành tiền cả dòng thì chia cho số lượng."),
            expiryDate: z.string().nullable().describe("Hạn dùng dạng YYYY-MM-DD nếu có, không thì null."),
          }),
        )
        .describe("Danh sách mặt hàng trên hóa đơn"),
    }),
  },
);
