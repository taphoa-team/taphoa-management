import { describe, it, expect } from "vitest";
import { buildSystemMessage } from "../src/prompts/system";

describe("buildSystemMessage", () => {
  it("chứa ngày hôm nay dạng YYYY-MM-DD", () => {
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
    const content = String(buildSystemMessage().content);
    expect(content).toContain(today);
  });

  it("dặn agent tự tính ngày, không hỏi lại", () => {
    const content = String(buildSystemMessage().content);
    expect(content).toMatch(/không hỏi lại ngày/i);
  });
});
