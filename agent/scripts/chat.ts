import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { graph } from "../src/graph/graph.js";

// Khung chat đơn giản trong terminal để test agent (chưa phải UI Phase 3).
// Chạy: npm run chat
const rl = readline.createInterface({ input, output });
console.log("💬 Chat với agent taphoa — gõ 'thoát' để dừng.\n");

let history: BaseMessage[] = [];

while (true) {
  const q = (await rl.question("Bạn: ")).trim();
  if (!q) continue;
  if (["thoát", "exit", "quit"].includes(q.toLowerCase())) break;

  history.push(new HumanMessage(q));
  try {
    const result = await graph.invoke({ messages: history });
    history = result.messages as BaseMessage[]; // giữ lịch sử để nhớ ngữ cảnh
    const last = history.at(-1);
    const answer = typeof last?.content === "string" ? last.content : JSON.stringify(last?.content);
    console.log("🤖 Agent:", answer, "\n");
  } catch (err) {
    console.error("⚠️  Lỗi:", err instanceof Error ? err.message : err, "\n");
  }
}

rl.close();
console.log("Tạm biệt 👋");
