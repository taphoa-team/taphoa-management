import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Cấu hình LLM ở MỘT chỗ duy nhất.
 * Sau này muốn đổi sang Claude → chỉ sửa file này (import ChatAnthropic).
 */
export function getLLM() {
  return new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    temperature: 0, // 0 = ổn định, ít "bịa"
    apiKey: process.env.GOOGLE_API_KEY,
  });
}
