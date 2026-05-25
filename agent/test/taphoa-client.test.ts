import { describe, it, expect } from "vitest";
import { TaphoaClient } from "../src/taphoa/client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("TaphoaClient", () => {
  it("login posts phone/password tới /api/auth/login và trả token", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fakeFetch = (async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return jsonResponse({ token: "jwt-123" });
    }) as typeof fetch;

    const client = new TaphoaClient({
      baseUrl: "http://test",
      phone: "0900",
      password: "pw",
      fetchFn: fakeFetch,
    });

    const token = await client.login();
    expect(token).toBe("jwt-123");
    expect(calls[0].url).toBe("http://test/api/auth/login");
    expect(JSON.parse(String(calls[0].init!.body))).toEqual({ phone: "0900", password: "pw" });
  });

  it("get tự login trước rồi gắn header Bearer", async () => {
    const seen: { url?: string; auth?: string } = {};
    const fakeFetch = (async (url: unknown, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/auth/login")) return jsonResponse({ token: "jwt-abc" });
      seen.url = u;
      seen.auth = (init?.headers as Record<string, string>)?.Authorization;
      return jsonResponse([{ id: 1, name: "Coca" }]);
    }) as typeof fetch;

    const client = new TaphoaClient({ baseUrl: "http://test", phone: "p", password: "w", fetchFn: fakeFetch });
    const data = await client.get<{ name: string }[]>("/inventory");
    expect(seen.url).toBe("http://test/api/inventory");
    expect(seen.auth).toBe("Bearer jwt-abc");
    expect(data[0].name).toBe("Coca");
  });

  it("get gặp 401 thì login lại 1 lần rồi thử lại", async () => {
    let loginCount = 0;
    let invCount = 0;
    const fakeFetch = (async (url: unknown) => {
      const u = String(url);
      if (u.endsWith("/api/auth/login")) {
        loginCount++;
        return jsonResponse({ token: `tok${loginCount}` });
      }
      invCount++;
      if (invCount === 1) return new Response("unauthorized", { status: 401 });
      return jsonResponse([{ ok: true }]);
    }) as typeof fetch;

    const client = new TaphoaClient({ baseUrl: "http://test", phone: "p", password: "w", fetchFn: fakeFetch });
    await client.login();
    const data = await client.get<{ ok: boolean }[]>("/inventory");
    expect(loginCount).toBe(2);
    expect(data[0].ok).toBe(true);
  });
});
