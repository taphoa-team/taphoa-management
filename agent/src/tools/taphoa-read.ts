import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { taphoa } from "../taphoa/client.js";

export const getInventory = tool(
  async ({ search }) => {
    const data = await taphoa.get("/inventory", search ? { search } : undefined);
    return JSON.stringify(data);
  },
  {
    name: "get_inventory",
    description:
      "Lấy TỒN KHO hiện tại của sản phẩm. Dùng khi user hỏi 'còn bao nhiêu', 'tồn kho', 'hết hàng chưa'. Tham số search để lọc theo tên.",
    schema: z.object({
      search: z.string().optional().describe("Lọc theo tên sản phẩm, vd 'Coca'. Bỏ trống = lấy tất cả."),
    }),
  },
);

export const listProducts = tool(
  async ({ search }) => JSON.stringify(await taphoa.get("/products", search ? { search } : undefined)),
  {
    name: "list_products",
    description: "Tra cứu danh sách SẢN PHẨM (tên, giá bán, đơn vị). Dùng khi cần tìm/đối chiếu thông tin sản phẩm.",
    schema: z.object({
      search: z.string().optional().describe("Lọc theo tên sản phẩm."),
    }),
  },
);

export const getLowStockAlerts = tool(
  async () => JSON.stringify(await taphoa.get("/alerts/low-stock")),
  {
    name: "get_low_stock_alerts",
    description: "Danh sách sản phẩm SẮP HẾT HÀNG (tồn kho thấp). Dùng khi user hỏi 'sắp hết gì', 'cần nhập thêm gì'.",
    schema: z.object({}),
  },
);

export const getExpiryAlerts = tool(
  async () => JSON.stringify(await taphoa.get("/alerts/expiry")),
  {
    name: "get_expiry_alerts",
    description: "Danh sách sản phẩm SẮP HẾT HẠN. Dùng khi user hỏi về hạn sử dụng, 'sắp hết hạn'.",
    schema: z.object({}),
  },
);

export const getRevenueReport = tool(
  async ({ from, to }) => JSON.stringify(await taphoa.get("/reports/revenue", { from, to })),
  {
    name: "get_revenue_report",
    description:
      "Báo cáo DOANH THU (tổng tiền bán ra) theo khoảng thời gian. KHÁC với lợi nhuận. Ngày dạng YYYY-MM-DD.",
    schema: z.object({
      from: z.string().describe("Ngày bắt đầu YYYY-MM-DD"),
      to: z.string().describe("Ngày kết thúc YYYY-MM-DD"),
    }),
  },
);

export const getTopProducts = tool(
  async ({ from, to, limit }) =>
    JSON.stringify(await taphoa.get("/reports/top-products", { from, to, ...(limit ? { limit } : {}) })),
  {
    name: "get_top_products",
    description: "Top sản phẩm BÁN CHẠY theo khoảng thời gian. Dùng khi user hỏi 'bán chạy nhất', 'top sản phẩm'.",
    schema: z.object({
      from: z.string().describe("Ngày bắt đầu YYYY-MM-DD"),
      to: z.string().describe("Ngày kết thúc YYYY-MM-DD"),
      limit: z.number().optional().describe("Số lượng top muốn lấy, vd 5. Mặc định 10, tối đa 50."),
    }),
  },
);

export const readTools = [
  getInventory,
  listProducts,
  getLowStockAlerts,
  getExpiryAlerts,
  getRevenueReport,
  getTopProducts,
];
