import { HumanMessage, type BaseMessage } from "@langchain/core/messages";

type Block = Record<string, unknown>;

/**
 * Chuẩn hóa 1 content block về dạng @langchain/google-genai chắc chắn đọc được.
 * - agent-chat-ui gửi ảnh: { type:"image", mimeType, data, metadata }
 * - ta map → { type:"image_url", image_url:{ url:"data:<mime>;base64,<data>" } }
 * Block khác (text, image_url đã đúng dạng, file/pdf) → giữ nguyên.
 */
export function normalizeImageBlock(block: Block): Block {
  if (block?.type === "image" && typeof block.data === "string" && !block.data.startsWith("data:")) {
    const mime = (block.mimeType as string) ?? (block.mime_type as string) ?? "image/jpeg";
    return { type: "image_url", image_url: { url: `data:${mime};base64,${block.data}` } };
  }
  return block;
}

/**
 * Áp normalizeImageBlock cho mọi HumanMessage có content dạng mảng.
 * Message khác (AI/Tool/System) và HumanMessage content string → giữ nguyên.
 * Chỉ tạo bản sao tạm để đưa vào LLM; KHÔNG thay state gốc.
 */
export function normalizeMessageContent(messages: BaseMessage[]): BaseMessage[] {
  return messages.map((m) => {
    if (m.getType() === "human" && Array.isArray(m.content)) {
      const content = (m.content as Block[]).map(normalizeImageBlock);
      // content là block thô từ wire (loose-typed) → cast qua kiểu content mà HumanMessage chấp nhận.
      return new HumanMessage({ content: content as unknown as HumanMessage["content"] });
    }
    return m;
  });
}
