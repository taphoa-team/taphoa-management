import { describe, it, expect } from "vitest";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { normalizeImageBlock, normalizeMessageContent } from "../src/graph/normalize";

describe("normalizeImageBlock", () => {
  it("block ảnh kiểu agent-chat-ui → image_url data-URI", () => {
    const out = normalizeImageBlock({ type: "image", mimeType: "image/png", data: "AAAA", metadata: { name: "x" } });
    expect(out).toEqual({ type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } });
  });

  it("block text giữ nguyên", () => {
    const t = { type: "text", text: "xin chào" };
    expect(normalizeImageBlock(t)).toEqual(t);
  });

  it("block image_url đã đúng dạng → giữ nguyên (idempotent)", () => {
    const b = { type: "image_url", image_url: { url: "data:image/jpeg;base64,ZZ" } };
    expect(normalizeImageBlock(b)).toEqual(b);
  });

  it("ảnh thiếu mimeType → mặc định image/jpeg", () => {
    const out = normalizeImageBlock({ type: "image", data: "BBBB" });
    expect(out).toEqual({ type: "image_url", image_url: { url: "data:image/jpeg;base64,BBBB" } });
  });
});

describe("normalizeMessageContent", () => {
  it("HumanMessage content mảng: ảnh được convert, text giữ; AIMessage không đụng", () => {
    const human = new HumanMessage({
      content: [
        { type: "text", text: "ghi đơn này" },
        { type: "image", mimeType: "image/jpeg", data: "IMG" },
      ],
    });
    const ai = new AIMessage("ok");
    const out = normalizeMessageContent([human, ai]);

    expect(out[0].getType()).toBe("human");
    expect(out[0].content).toEqual([
      { type: "text", text: "ghi đơn này" },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,IMG" } },
    ]);
    expect(out[1]).toBe(ai); // AIMessage giữ nguyên tham chiếu
  });

  it("HumanMessage content string giữ nguyên", () => {
    const human = new HumanMessage("tồn kho coca?");
    const out = normalizeMessageContent([human]);
    expect(out[0].content).toBe("tồn kho coca?");
  });
});
