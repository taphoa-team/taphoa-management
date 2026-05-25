# Taphoa Chat Agent — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một LangGraph.js agent đọc dữ liệu taphoa và trả lời câu hỏi tự nhiên (tồn kho, doanh thu, cảnh báo...), xem chạy trực quan trong LangGraph Studio.

**Architecture:** Một StateGraph hand-rolled (state = messages) với 2 node: `agent` (Gemini + tools) và `tools` (ToolNode chạy các tool gọi GET API taphoa). Conditional edge tạo vòng lặp ReAct. Chạy bằng `langgraph dev` → mở Studio.

**Tech Stack:** TypeScript, `@langchain/langgraph`, `@langchain/google-genai` (Gemini), `zod`, native `fetch`, `vitest` (test), `@langchain/langgraph-cli` (dev server). Tất cả trong thư mục `agent/`.

> **Spec gốc:** `docs/superpowers/specs/2026-05-25-taphoa-chat-agent-design.md`
> **Phase này KHÔNG bao gồm:** SQLite, feature ảnh hóa đơn, Agent Chat UI (Phase 2 & 3).

---

## File Structure (Phase 1)

```
agent/
├── package.json            # deps + scripts
├── tsconfig.json           # cấu hình TypeScript
├── langgraph.json          # trỏ langgraph dev tới graph
├── .env.example            # mẫu biến môi trường
├── .gitignore              # bỏ qua node_modules, .env
├── src/
│   ├── llm.ts              # cấu hình Gemini (1 chỗ duy nhất)
│   ├── taphoa/client.ts    # TaphoaClient: login + get (có inject fetch để test)
│   ├── tools/taphoa-read.ts# các read tool + mảng readTools
│   └── graph/graph.ts      # StateGraph: agent ⇄ tools (export `graph`)
└── test/
    └── taphoa-client.test.ts
```

---

## Task 0: Prerequisites (làm tay, không code)

- [ ] **Lấy Gemini API key**: vào https://aistudio.google.com → "Get API key" → copy. (Free tier.)
- [ ] **taphoa backend đang chạy** ở `http://localhost:8082` (chạy `./start-all.sh` hoặc backend riêng). Kiểm tra: `curl http://localhost:8082/health` trả về OK.
- [ ] **Có 1 tài khoản taphoa** (SĐT + mật khẩu) để agent đăng nhập. Dùng tài khoản sẵn có.
- [ ] Node đã cài (đã xác nhận: v24).

---

## Task 1: Scaffold project `agent/`

**Files:**
- Create: `agent/package.json`
- Create: `agent/tsconfig.json`
- Create: `agent/.gitignore`
- Create: `agent/.env.example`

- [ ] **Step 1: Tạo `agent/package.json`**

```json
{
  "name": "taphoa-agent",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "langgraphjs dev",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@langchain/core": "^0.3.0",
    "@langchain/google-genai": "^0.2.0",
    "@langchain/langgraph": "^0.4.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@langchain/langgraph-cli": "^0.0.30",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

> Lưu ý: số version là mốc gần đúng (tháng 5/2026 có thể mới hơn). Sau khi `npm install`, chạy `npm outdated` để xem bản mới; nếu API đổi, đối chiếu `services/caddie-v3` trong b3-mono.

- [ ] **Step 2: Tạo `agent/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Tạo `agent/.gitignore`**

```
node_modules/
dist/
.env
test-fixtures/
.langgraph_api/
```

- [ ] **Step 4: Tạo `agent/.env.example`**

```
# Gemini (https://aistudio.google.com)
GOOGLE_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# taphoa backend
TAPHOA_API_URL=http://localhost:8082
TAPHOA_PHONE=
TAPHOA_PASSWORD=

# LangSmith (tùy chọn — bật để xem trace)
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=taphoa-agent
```

- [ ] **Step 5: Cài deps**

Run: `cd agent && npm install`
Expected: tạo `node_modules/` + `package-lock.json`, không lỗi.

- [ ] **Step 6: Tạo `agent/.env` thật** (copy từ `.env.example`, điền key + SĐT + mật khẩu). KHÔNG commit file này.

Run: `cp agent/.env.example agent/.env` rồi mở điền giá trị.

- [ ] **Step 7: Commit**

```bash
git add agent/package.json agent/tsconfig.json agent/.gitignore agent/.env.example agent/package-lock.json
git commit -m "chore: scaffold taphoa agent project"
```

---

## Task 2: TaphoaClient (login + GET) — TDD

**Files:**
- Test: `agent/test/taphoa-client.test.ts`
- Create: `agent/src/taphoa/client.ts`

> **Vì sao có `fetchFn` trong config?** Đây là **dependency injection** — cho phép test "tiêm" một fetch giả, không cần backend thật. Production dùng `fetch` thật. Đây là lý do client viết theo dạng class.

- [ ] **Step 1: Viết test thất bại** — `agent/test/taphoa-client.test.ts`

```ts
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
```

- [ ] **Step 2: Chạy test để chắc chắn FAIL**

Run: `cd agent && npx vitest run test/taphoa-client.test.ts`
Expected: FAIL — `Cannot find module '../src/taphoa/client'`.

- [ ] **Step 3: Viết implementation tối thiểu** — `agent/src/taphoa/client.ts`

```ts
export interface TaphoaConfig {
  baseUrl: string;
  phone: string;
  password: string;
  /** Cho test tiêm fetch giả; production để trống → dùng fetch thật. */
  fetchFn?: typeof fetch;
}

export class TaphoaClient {
  private token: string | null = null;

  constructor(private cfg: TaphoaConfig) {}

  private get f(): typeof fetch {
    return this.cfg.fetchFn ?? fetch;
  }

  async login(): Promise<string> {
    const res = await this.f(`${this.cfg.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: this.cfg.phone, password: this.cfg.password }),
    });
    if (!res.ok) throw new Error(`Login thất bại: ${res.status}`);
    const data = (await res.json()) as { token: string };
    this.token = data.token;
    return data.token;
  }

  async get<T = unknown>(path: string, params?: Record<string, string | number>): Promise<T> {
    if (!this.token) await this.login();

    const doFetch = () => {
      const url = new URL(`${this.cfg.baseUrl}/api${path}`);
      if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
      return this.f(url, { headers: { Authorization: `Bearer ${this.token}` } });
    };

    let res = await doFetch();
    if (res.status === 401) {
      await this.login(); // token hết hạn → login lại 1 lần
      res = await doFetch();
    }
    if (!res.ok) throw new Error(`GET ${path} thất bại: ${res.status}`);
    return (await res.json()) as T;
  }
}

/** Instance dùng chung, dựng từ biến môi trường. */
export const taphoa = new TaphoaClient({
  baseUrl: process.env.TAPHOA_API_URL ?? "http://localhost:8082",
  phone: process.env.TAPHOA_PHONE ?? "",
  password: process.env.TAPHOA_PASSWORD ?? "",
});
```

- [ ] **Step 4: Chạy test để chắc chắn PASS**

Run: `cd agent && npx vitest run test/taphoa-client.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add agent/src/taphoa/client.ts agent/test/taphoa-client.test.ts
git commit -m "feat: add taphoa API client with login and 401 retry"
```

---

## Task 3: LLM config (Gemini)

**Files:**
- Create: `agent/src/llm.ts`

- [ ] **Step 1: Tạo `agent/src/llm.ts`**

```ts
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
```

> Không có unit test cho file này (chỉ là cấu hình, sẽ verify gián tiếp khi graph chạy ở Task 6). Nếu model id báo lỗi "not found", vào AI Studio xem tên model hiện hành rồi sửa `GEMINI_MODEL` trong `.env`.

- [ ] **Step 2: Commit**

```bash
git add agent/src/llm.ts
git commit -m "feat: add Gemini LLM config (swappable provider)"
```

---

## Task 4: Read tools

**Files:**
- Create: `agent/src/tools/taphoa-read.ts`

> Tool = hàm + schema. `description` phải rõ ràng + phân biệt với tool na ná (vd doanh thu ≠ lợi nhuận), nếu không agent gọi nhầm → trả lời sai mà vẫn trôi chảy.

- [ ] **Step 1: Tạo `agent/src/tools/taphoa-read.ts`**

```ts
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
```

> **Đã verify** (codemap + đọc `backend/handlers/report.go`): `/reports/revenue` dùng `from`/`to` (default hôm nay); `/reports/top-products` dùng `from`/`to` + `limit` (default 10, max 50) + `sort`. Ngày dạng `YYYY-MM-DD`.

- [ ] **Step 2: Smoke check biên dịch**

Run: `cd agent && npx tsc --noEmit`
Expected: không có lỗi type.

- [ ] **Step 3: Commit**

```bash
git add agent/src/tools/taphoa-read.ts
git commit -m "feat: add read-only taphoa tools for the agent"
```

---

## Task 5: Graph (StateGraph: agent ⇄ tools)

**Files:**
- Create: `agent/src/graph/graph.ts`

> Đây là phần cốt lõi LangGraph: `MessagesAnnotation` = state có sẵn (lịch sử messages + cách gộp). `agentNode` gọi LLM; `shouldContinue` là conditional edge; `ToolNode` chạy tool. Vòng lặp: agent → (có tool?) → tools → agent → ... → END.

- [ ] **Step 1: Tạo `agent/src/graph/graph.ts`**

```ts
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import type { AIMessage } from "@langchain/core/messages";
import { getLLM } from "../llm.js";
import { readTools } from "../tools/taphoa-read.js";

const llmWithTools = getLLM().bindTools(readTools);

// Node `agent`: gọi LLM, có thể trả lời hoặc đòi gọi tool.
async function agentNode(state: typeof MessagesAnnotation.State) {
  const response = await llmWithTools.invoke(state.messages);
  return { messages: [response] };
}

// Conditional edge: nếu LLM đòi tool → đi "tools"; không → END.
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  return last.tool_calls && last.tool_calls.length > 0 ? "tools" : END;
}

const toolNode = new ToolNode(readTools);

export const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent")
  .compile();
```

- [ ] **Step 2: Smoke check biên dịch**

Run: `cd agent && npx tsc --noEmit`
Expected: không có lỗi type.

- [ ] **Step 3: Commit**

```bash
git add agent/src/graph/graph.ts
git commit -m "feat: add ReAct StateGraph (agent + tool node)"
```

---

## Task 6: Chạy dev server + verify trong Studio (làm tay)

**Files:**
- Create: `agent/langgraph.json`

- [ ] **Step 1: Tạo `agent/langgraph.json`**

```json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/graph/graph.ts:graph"
  },
  "env": ".env"
}
```

- [ ] **Step 2: Chạy dev server**

Run: `cd agent && npm run dev`
Expected: in ra URL kiểu `http://localhost:2024` và link Studio
`https://smith.langchain.com/studio/?baseUrl=http://localhost:2024`.

- [ ] **Step 3: Mở Studio + thử các câu hỏi**

Mở link Studio. Trong ô input, thử lần lượt và quan sát graph chạy (node sáng lên), kiểm tra agent gọi đúng tool:

| Câu hỏi | Kỳ vọng |
|---|---|
| "Tồn kho Coca còn bao nhiêu?" | gọi `get_inventory(search:"Coca")` → trả số tồn |
| "Sản phẩm nào sắp hết hàng?" | gọi `get_low_stock_alerts` |
| "Top 5 sản phẩm bán chạy tháng này?" | gọi `get_top_products` với from/to |

- [ ] **Step 4: Mở LangSmith xem trace** (nếu đã bật env): vào project `taphoa-agent`, mở 1 run, xem các bước + tool calls + token.

- [ ] **Step 5: Commit**

```bash
git add agent/langgraph.json
git commit -m "chore: add langgraph dev server config"
```

---

## Task 7: Verification cuối Phase 1

- [ ] **Chạy toàn bộ test**

Run: `cd agent && npm test`
Expected: tất cả test PASS.

- [ ] **Checklist "chạy được" (Definition of Done Phase 1):**
  - [ ] `npm test` xanh.
  - [ ] `npm run dev` mở được Studio.
  - [ ] Hỏi "tồn kho X" → agent gọi `get_inventory` → trả lời đúng dữ liệu thật.
  - [ ] Hỏi câu cần báo cáo → agent gọi đúng tool (không nhầm doanh thu/lợi nhuận).
  - [ ] Trace hiện trong LangSmith (nếu bật).

- [ ] **Nếu agent gọi nhầm tool:** sửa `description` trong `taphoa-read.ts` cho rõ hơn (đây là cách debug chính ở tầng tool).

---

## Self-Review (đã kiểm)

- **Spec coverage:** Phase 1 phủ mục 6.1/6.2/6.3 (graph, agent node, read tools), mục 6.5 (client), mục 10 (auth), mục 8 (chạy dev/Studio), mục 9 (LangSmith). Mục 6.4 (invoice) + mục 7 (SQLite) thuộc Phase 2 — ngoài phạm vi, có chủ đích.
- **Placeholder:** không có TBD/TODO; mọi step có code/lệnh cụ thể.
- **Type consistency:** `TaphoaClient.get()` / `.login()` / `taphoa` dùng nhất quán giữa client → tools → graph; `readTools` định nghĩa ở Task 4 dùng lại ở Task 5.

---

## Next

Sau khi Phase 1 đạt Definition of Done → lập **Plan Phase 2** (SQLite store + invoice tool: vision extraction + matching + price alert).
