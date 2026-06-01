import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { HumanMessage } from "@langchain/core/messages";
import { graph } from "../src/graph/graph.js";

// Test tính năng đọc ảnh hóa đơn mà chưa cần UI (Phase 3).
// Chạy: npm run invoice -- ./test-fixtures/hoadon1.jpg
const path = process.argv[2];
if (!path) {
  console.error("Cách dùng: npm run invoice -- <đường-dẫn-ảnh>");
  process.exit(1);
}

const b64 = readFileSync(path).toString("base64");
const mime = extname(path).toLowerCase() === ".png" ? "image/png" : "image/jpeg";

const message = new HumanMessage({
  content: [
    { type: "text", text: "Đây là ảnh hóa đơn nhập hàng. Hãy đọc và ghi nhận giúp tôi." },
    { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
  ],
});

const result = await graph.invoke({ messages: [message] });
const last = result.messages.at(-1);
console.log("\n🤖 Agent:\n", typeof last?.content === "string" ? last.content : JSON.stringify(last?.content, null, 2));
