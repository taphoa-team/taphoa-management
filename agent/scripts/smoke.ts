import { HumanMessage } from "@langchain/core/messages";
import { graph } from "../src/graph/graph.js";

// Chạy: node --env-file=.env --import tsx scripts/smoke.ts "câu hỏi"
const question = process.argv[2] ?? "Tồn kho Coca còn bao nhiêu?";

try {
  console.log("=== Đang gọi agent với:", question);
  const result = await graph.invoke({ messages: [new HumanMessage(question)] });

  for (const m of result.messages) {
    const toolCalls = (m as { tool_calls?: { name: string; args: unknown }[] }).tool_calls;
    if (toolCalls?.length) {
      for (const t of toolCalls) console.log("  → tool gọi:", t.name, JSON.stringify(t.args));
    }
  }
  const last = result.messages.at(-1);
  const answer = typeof last?.content === "string" ? last.content : JSON.stringify(last?.content);
  console.log("=== Trả lời:", answer);
  console.log("=== Tổng số message:", result.messages.length);
} catch (err) {
  console.error("=== LỖI:", err instanceof Error ? err.message : err);
  process.exit(1);
}
