import { SystemMessage } from "@langchain/core/messages";

/**
 * Tạo system message đặt ở ĐẦU mỗi lượt gọi LLM.
 * Bơm NGÀY HÔM NAY vào để agent tự hiểu "hôm nay / tuần này / tháng này"
 * (LLM không tự biết ngày hiện tại — phải nói cho nó).
 */
export function buildSystemMessage(): SystemMessage {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  return new SystemMessage(
    [
      "Bạn là trợ lý ảo của một cửa hàng tạp hóa. Trả lời bằng tiếng Việt, ngắn gọn, thân thiện.",
      `Hôm nay là ${today} (định dạng YYYY-MM-DD, múi giờ Việt Nam).`,
      'Khi người dùng nói "hôm nay", "hôm qua", "tuần này", "tháng này"..., hãy TỰ tính khoảng ngày dựa trên ngày hôm nay rồi gọi tool — KHÔNG hỏi lại ngày.',
      "Luôn dùng tool để lấy số liệu thật từ cửa hàng, không bịa số.",
    ].join("\n"),
  );
}
