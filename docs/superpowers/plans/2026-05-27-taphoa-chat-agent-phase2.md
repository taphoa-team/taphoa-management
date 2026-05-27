# Taphoa Chat Agent — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tính năng **đọc ảnh hóa đơn nhập hàng**: Gemini (vision) đọc ảnh → trích xuất nhà cung cấp + danh sách mặt hàng → đối chiếu với sản phẩm trong cửa hàng → **cảnh báo giá nhập thay đổi** (so với lô gần nhất) → **lưu bản nháp** vào SQLite riêng. KHÔNG ghi vào kho thật.

**Architecture:** Thêm 1 tool `record_purchase_invoice` vào graph ReAct sẵn có. Tool dùng schema = cấu trúc hóa đơn → Gemini đọc ảnh rồi điền vào schema chính là bước "trích xuất". Logic được tách thành các module thuần (pure) dễ test: `invoice/match.ts` (so khớp tên), `invoice/pricing.ts` (tính % thay đổi + biên lợi nhuận), `invoice/core.ts` (orchestrate, nhận dependencies để test được), `store/` (SQLite). Cost (giá vốn) lấy từ `GET /products/:id/batches` (lô mới nhất).

**Tech Stack:** TypeScript, `@langchain/langgraph` (v1), `@langchain/google-genai` (Gemini vision), `zod` (v4), `better-sqlite3` (lưu nháp), `vitest` (test). Tất cả trong `agent/`.

> **Spec gốc:** `docs/superpowers/specs/2026-05-25-taphoa-chat-agent-design.md` (mục 6.4, 7).
> **Phase này KHÔNG bao gồm:** Agent Chat UI (Phase 3), human-in-the-loop `interrupt` để biến nháp thành đơn nhập thật (v2), Telegram/Zalo (v2).

---

## ⚠️ Hai chỉnh sửa so với spec (đã verify bằng đọc backend)

1. **Giá vốn KHÔNG nằm ở `price-history`.** Spec mục 6.4/7 nói lấy giá vốn qua `GET /products/:id/price-history`. Đọc `backend/models/price_history.go` thì `PriceHistory` là lịch sử **giá BÁN** (`old_price`/`new_price`/`changed_by`). Giá vốn (`cost_price`) thật nằm ở `ProductBatch`, lấy qua `GET /products/:id/batches` (`backend/handlers/product.go:374`). → Plan dùng `/products/:id/batches`, lấy lô có `received_at` mới nhất làm "giá vốn gần nhất".
2. **`/products` có phân trang** (`limit` mặc định 20, tối đa 100 — `backend/handlers/helpers.go:13`). Để match cần toàn bộ catalog → tool phải lặp qua các trang (`page=1,2,...`, `limit=100`) tới khi hết.

Ghi chú: mọi giá là `int` (VND, không thập phân). `/products` trả **mảng** object gồm các field của `Product` (`id`, `name`, `sell_price`, `unit`, ...) + `stock`. `/products/:id/batches` trả **mảng** `ProductBatch` (`cost_price`, `quantity`, `received_at`, `expiry_date`).

---

## File Structure (Phase 2)

```
agent/
├── package.json                  # MODIFY: thêm better-sqlite3 + @types, script "invoice"
├── .gitignore                    # MODIFY: bỏ qua *.db, data/
├── .env.example                  # MODIFY: thêm AGENT_DB_PATH
├── src/
│   ├── invoice/
│   │   ├── match.ts              # NEW: normalizeName + matchProduct (thuần, test được)
│   │   ├── pricing.ts            # NEW: computePriceAlert (thuần, test được)
│   │   ├── core.ts               # NEW: processInvoice(input, deps) — orchestrate
│   │   └── tool.ts               # NEW: record_purchase_invoice (wire deps thật: taphoa + db)
│   ├── store/
│   │   ├── db.ts                 # NEW: openDb + migrate (3 bảng) + instance `db`
│   │   └── drafts.ts             # NEW: saveDraft(db, draft) — insert trong transaction
│   ├── graph/graph.ts            # MODIFY: thêm recordPurchaseInvoice vào tools
│   └── prompts/system.ts         # MODIFY: thêm hướng dẫn về ảnh hóa đơn
├── scripts/
│   └── invoice.ts                # NEW: harness CLI — đọc ảnh local → graph (test không cần UI)
└── test/
    ├── invoice-match.test.ts     # NEW
    ├── invoice-pricing.test.ts   # NEW
    ├── invoice-store.test.ts     # NEW
    └── invoice-core.test.ts      # NEW
```

**Vì sao tách `invoice/` thành 4 file thay vì 1 `tools/invoice.ts` như spec phác?**
Logic match + tính giá + orchestrate là phần dễ sai nhất → tách thành **hàm thuần** (không gọi network/LLM/DB) để **unit-test** được. `core.ts` nhận `deps` (dependency injection, giống `fetchFn` của `TaphoaClient` ở Phase 1) → test bằng deps giả, không cần backend. `tool.ts` chỉ là lớp mỏng nối deps thật vào.

---

## Task 0: Prerequisites (làm tay, không code)

- [ ] **Backend taphoa đang chạy** ở `http://localhost:8082`, có dữ liệu sản phẩm + ít nhất vài lô (`batches`) để có giá vốn so sánh. Kiểm tra: `curl http://localhost:8082/health`.
- [ ] **`.env` đã có** `GOOGLE_API_KEY`, `TAPHOA_PHONE`, `TAPHOA_PASSWORD` (từ Phase 1). Model `gemini-2.5-flash` có vision sẵn — không cần đổi.
- [ ] **Chuẩn bị 3-5 ảnh hóa đơn nhập thật** (in + viết tay, rõ + mờ), để trong `agent/test-fixtures/` (đã gitignore). Dùng để test tay ở Task 8.

---

## Task 1: Thêm deps + cấu hình (better-sqlite3, gitignore, env)

**Files:**
- Modify: `agent/package.json`
- Modify: `agent/.gitignore`
- Modify: `agent/.env.example`

- [ ] **Step 1: Cài `better-sqlite3` + types**

Run:
```bash
cd agent && npm install better-sqlite3 && npm install -D @types/better-sqlite3
```
Expected: cài xong, không lỗi build native. (Nếu lỗi build trên Node 24, chạy `npm install better-sqlite3@latest` để lấy bản hỗ trợ Node hiện tại — đây là module native nên phải khớp phiên bản Node.)

- [ ] **Step 2: Thêm script `invoice` vào `agent/package.json`**

Sửa khối `"scripts"` thành (giữ nguyên các script cũ, thêm dòng `invoice` — chạy theo đúng kiểu `chat` đã có để tự nạp `.env`):

```json
  "scripts": {
    "dev": "langgraphjs dev",
    "chat": "node --env-file=.env --import tsx scripts/chat.ts",
    "invoice": "node --env-file=.env --import tsx scripts/invoice.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 3: Thêm vào `agent/.gitignore`** (file SQLite không commit)

Thêm vào cuối file:
```
# SQLite riêng của agent (drafts, price observations)
*.db
*.db-shm
*.db-wal
data/
```

- [ ] **Step 4: Thêm `AGENT_DB_PATH` vào `agent/.env.example`**

Thêm vào cuối file:
```
# SQLite riêng của agent (drafts hóa đơn + observations). Bỏ trống = data/agent.db
AGENT_DB_PATH=data/agent.db
```

- [ ] **Step 5: Commit**

```bash
git add agent/package.json agent/package-lock.json agent/.gitignore agent/.env.example
git commit -m "chore: add better-sqlite3 and invoice script for phase 2"
```

---

## Task 2: `invoice/match.ts` — so khớp tên sản phẩm (TDD)

**Files:**
- Test: `agent/test/invoice-match.test.ts`
- Create: `agent/src/invoice/match.ts`

> **Ý tưởng:** tên trên ảnh thường ngắn/thiếu dấu ("Coca", "Mi Hao Hao") còn DB ghi đầy đủ ("Coca Cola lon 330ml"). Ta **chuẩn hóa** (bỏ dấu tiếng Việt + lowercase) rồi tính **tỉ lệ token của tên-ảnh được tên-DB bao phủ**. Nếu 2 sản phẩm điểm sát nhau → `ambiguous` (không đoán bừa, liệt kê cho user). Điểm thấp → `unmatched` (hàng mới).

- [ ] **Step 1: Viết test thất bại** — `agent/test/invoice-match.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { normalizeName, scoreName, matchProduct } from "../src/invoice/match";

const products = [
  { id: 1, name: "Coca Cola lon 330ml", sell_price: 12000, unit: "lon" },
  { id: 2, name: "Coca Cola chai 1.5L", sell_price: 22000, unit: "chai" },
  { id: 3, name: "Mì Hảo Hảo tôm chua cay", sell_price: 4000, unit: "gói" },
];

describe("normalizeName", () => {
  it("bỏ dấu tiếng Việt + lowercase + gộp khoảng trắng", () => {
    expect(normalizeName("Cà Phê  Sữa")).toBe("ca phe sua");
    expect(normalizeName("Đường")).toBe("duong");
    expect(normalizeName("Mì Hảo Hảo")).toBe("mi hao hao");
  });
});

describe("scoreName", () => {
  it("tên ngắn nằm trong tên đầy đủ → điểm 1", () => {
    expect(scoreName("Coca", "Coca Cola lon 330ml")).toBe(1);
  });
  it("không liên quan → điểm 0", () => {
    expect(scoreName("Coca", "Mì Hảo Hảo tôm chua cay")).toBe(0);
  });
});

describe("matchProduct", () => {
  it("khớp duy nhất → matched", () => {
    const r = matchProduct("Mì Hảo Hảo", products);
    expect(r.status).toBe("matched");
    expect(r.productId).toBe(3);
    expect(r.sellPrice).toBe(4000);
  });

  it("nhiều ứng viên sát nhau → ambiguous + liệt kê candidates", () => {
    const r = matchProduct("Coca", products);
    expect(r.status).toBe("ambiguous");
    expect(r.productId).toBeNull();
    expect(r.candidates.map((c) => c.id).sort()).toEqual([1, 2]);
  });

  it("không sản phẩm nào hợp → unmatched", () => {
    const r = matchProduct("Bánh quy bơ", products);
    expect(r.status).toBe("unmatched");
    expect(r.productId).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd agent && npx vitest run test/invoice-match.test.ts`
Expected: FAIL — `Cannot find module '../src/invoice/match'`.

- [ ] **Step 3: Viết implementation** — `agent/src/invoice/match.ts`

```ts
export interface ProductLite {
  id: number;
  name: string;
  sell_price: number;
  unit?: string;
}

export interface MatchCandidate {
  id: number;
  name: string;
  score: number;
}

export interface MatchResult {
  status: "matched" | "ambiguous" | "unmatched";
  productId: number | null;
  productName: string | null;
  sellPrice: number | null;
  score: number;
  candidates: MatchCandidate[];
}

const MATCH_THRESHOLD = 0.5; // phải bao phủ >= nửa số token của tên-ảnh mới coi là khớp
const AMBIGUOUS_GAP = 0.15; // 2 ứng viên chênh điểm < ngần này → coi là mơ hồ

/** Bỏ dấu tiếng Việt, lowercase, bỏ ký tự lạ, gộp khoảng trắng. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD") // tách chữ và dấu thành 2 ký tự riêng
    .replace(/[̀-ͯ]/g, "") // xóa các dấu (huyền, sắc, mũ...)
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ") // bỏ ký tự đặc biệt
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalizeName(s).split(" ").filter((t) => t.length >= 1);
}

/** 1 token "khớp" nếu bằng nhau, hoặc chứa nhau (cả hai >= 2 ký tự để tránh khớp lung tung). */
function tokenMatches(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 2 && b.length >= 2) return a.includes(b) || b.includes(a);
  return false;
}

/** Điểm = tỉ lệ token của tên-ảnh được tên-sản-phẩm bao phủ (0..1). */
export function scoreName(rawName: string, productName: string): number {
  const rawTokens = tokens(rawName);
  if (rawTokens.length === 0) return 0;
  const prodTokens = tokens(productName);
  let hit = 0;
  for (const rt of rawTokens) {
    if (prodTokens.some((pt) => tokenMatches(rt, pt))) hit++;
  }
  return hit / rawTokens.length;
}

export function matchProduct(rawName: string, products: ProductLite[]): MatchResult {
  const scored = products
    .map((p) => ({ id: p.id, name: p.name, sell_price: p.sell_price, score: scoreName(rawName, p.name) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < MATCH_THRESHOLD) {
    return {
      status: "unmatched",
      productId: null,
      productName: null,
      sellPrice: null,
      score: top?.score ?? 0,
      candidates: scored.slice(0, 3).map((s) => ({ id: s.id, name: s.name, score: s.score })),
    };
  }

  const second = scored[1];
  const ambiguous = !!second && second.score >= MATCH_THRESHOLD && top.score - second.score < AMBIGUOUS_GAP;
  if (ambiguous) {
    return {
      status: "ambiguous",
      productId: null,
      productName: null,
      sellPrice: null,
      score: top.score,
      candidates: scored
        .filter((s) => s.score >= MATCH_THRESHOLD && top.score - s.score < AMBIGUOUS_GAP)
        .slice(0, 3)
        .map((s) => ({ id: s.id, name: s.name, score: s.score })),
    };
  }

  return {
    status: "matched",
    productId: top.id,
    productName: top.name,
    sellPrice: top.sell_price,
    score: top.score,
    candidates: [],
  };
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd agent && npx vitest run test/invoice-match.test.ts`
Expected: PASS — tất cả test xanh.

- [ ] **Step 5: Commit**

```bash
git add agent/src/invoice/match.ts agent/test/invoice-match.test.ts
git commit -m "feat: add product name matching for invoice photos"
```

---

## Task 3: `invoice/pricing.ts` — cảnh báo giá (TDD)

**Files:**
- Test: `agent/test/invoice-pricing.test.ts`
- Create: `agent/src/invoice/pricing.ts`

> **Công thức:** `pctChange = (giáMới - giáCũ) / giáCũ × 100`. `margin (biên LN) = (giáBán - giáVốn) / giáBán` (0..1). Nếu chưa có giá vốn cũ → không so sánh được (`pctChange = null`). Tránh chia 0 (giá cũ = 0) và giá bán <= 0.

- [ ] **Step 1: Viết test thất bại** — `agent/test/invoice-pricing.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { computePriceAlert } from "../src/invoice/pricing";

describe("computePriceAlert", () => {
  it("giá vốn tăng → direction up + pctChange + 2 biên LN", () => {
    const a = computePriceAlert({ sellPrice: 15000, previousCost: 10000, newCost: 12000 });
    expect(a.direction).toBe("up");
    expect(a.pctChange).toBeCloseTo(20);
    expect(a.oldMargin).toBeCloseTo((15000 - 10000) / 15000);
    expect(a.newMargin).toBeCloseTo((15000 - 12000) / 15000);
  });

  it("không có giá vốn cũ → pctChange null, direction unknown, vẫn tính newMargin", () => {
    const a = computePriceAlert({ sellPrice: 15000, previousCost: null, newCost: 12000 });
    expect(a.pctChange).toBeNull();
    expect(a.direction).toBe("unknown");
    expect(a.oldMargin).toBeNull();
    expect(a.newMargin).toBeCloseTo(0.2);
  });

  it("giá cũ = 0 → không chia 0 (pctChange null)", () => {
    const a = computePriceAlert({ sellPrice: 15000, previousCost: 0, newCost: 12000 });
    expect(a.pctChange).toBeNull();
  });

  it("chưa match (sellPrice null) → 2 biên LN đều null", () => {
    const a = computePriceAlert({ sellPrice: null, previousCost: 10000, newCost: 12000 });
    expect(a.oldMargin).toBeNull();
    expect(a.newMargin).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd agent && npx vitest run test/invoice-pricing.test.ts`
Expected: FAIL — `Cannot find module '../src/invoice/pricing'`.

- [ ] **Step 3: Viết implementation** — `agent/src/invoice/pricing.ts`

```ts
export interface PriceAlertInput {
  sellPrice: number | null; // giá bán hiện tại (VND), null nếu chưa match được sản phẩm
  previousCost: number | null; // giá vốn lô gần nhất (VND), null nếu chưa từng nhập
  newCost: number; // giá nhập trên hóa đơn (VND)
}

export interface PriceAlert {
  newCost: number;
  previousCost: number | null;
  pctChange: number | null; // % thay đổi giá vốn; null nếu không có giá cũ để so
  oldMargin: number | null; // biên LN cũ (0..1)
  newMargin: number | null; // biên LN mới (0..1)
  direction: "up" | "down" | "same" | "unknown";
}

function margin(sellPrice: number | null, cost: number | null): number | null {
  if (sellPrice === null || cost === null || sellPrice <= 0) return null;
  return (sellPrice - cost) / sellPrice;
}

export function computePriceAlert(input: PriceAlertInput): PriceAlert {
  const { sellPrice, previousCost, newCost } = input;

  let pctChange: number | null = null;
  let direction: PriceAlert["direction"] = "unknown";
  if (previousCost !== null && previousCost > 0) {
    pctChange = ((newCost - previousCost) / previousCost) * 100;
    direction = newCost > previousCost ? "up" : newCost < previousCost ? "down" : "same";
  }

  return {
    newCost,
    previousCost,
    pctChange,
    oldMargin: margin(sellPrice, previousCost),
    newMargin: margin(sellPrice, newCost),
    direction,
  };
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd agent && npx vitest run test/invoice-pricing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/src/invoice/pricing.ts agent/test/invoice-pricing.test.ts
git commit -m "feat: add cost-price change and margin alert logic"
```

---

## Task 4: `store/db.ts` + `store/drafts.ts` — SQLite (TDD)

**Files:**
- Test: `agent/test/invoice-store.test.ts`
- Create: `agent/src/store/db.ts`
- Create: `agent/src/store/drafts.ts`

> **`better-sqlite3` chạy đồng bộ (synchronous)** — không cần `await`, code đơn giản hơn. Test mở DB `:memory:` (DB trong RAM, biến mất sau test) nên không đụng file thật. `saveDraft` nhận `db` làm tham số (dependency injection) → test tiêm DB `:memory:`.

- [ ] **Step 1: Viết test thất bại** — `agent/test/invoice-store.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { openDb } from "../src/store/db";
import { saveDraft } from "../src/store/drafts";

describe("saveDraft", () => {
  it("lưu draft + items + observations trong 1 transaction", () => {
    const db = openDb(":memory:");
    const id = saveDraft(db, {
      supplierName: "NCC A",
      rawJson: '{"x":1}',
      items: [
        { rawName: "Coca", matchedProductId: 1, quantity: 10, unit: "lon", costPrice: 8000, expiryDate: null },
        { rawName: "Hàng lạ", matchedProductId: null, quantity: 5, unit: "cái", costPrice: 3000, expiryDate: "2027-01-01" },
      ],
      observations: [
        {
          productId: 1,
          rawName: "Coca",
          observedCostPrice: 8000,
          previousCostPrice: 7000,
          pctChange: 14.29,
          sellPrice: 12000,
          oldMargin: 0.4167,
          newMargin: 0.3333,
        },
      ],
    });

    expect(id).toBeGreaterThan(0);

    const draft = db.prepare("SELECT * FROM draft_invoices WHERE id = ?").get(id) as Record<string, unknown>;
    expect(draft.supplier_name).toBe("NCC A");
    expect(draft.status).toBe("draft");

    const items = db.prepare("SELECT * FROM draft_invoice_items WHERE draft_id = ?").all(id);
    expect(items).toHaveLength(2);

    const obs = db.prepare("SELECT * FROM price_observations").all();
    expect(obs).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd agent && npx vitest run test/invoice-store.test.ts`
Expected: FAIL — `Cannot find module '../src/store/db'`.

- [ ] **Step 3: Tạo `agent/src/store/db.ts`**

```ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS draft_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  raw_json TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS draft_invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  draft_id INTEGER NOT NULL REFERENCES draft_invoices(id),
  raw_name TEXT NOT NULL,
  matched_product_id INTEGER,
  quantity REAL,
  unit TEXT,
  cost_price INTEGER,
  expiry_date TEXT
);

CREATE TABLE IF NOT EXISTS price_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  raw_name TEXT NOT NULL,
  observed_cost_price INTEGER NOT NULL,
  previous_cost_price INTEGER,
  pct_change REAL,
  sell_price INTEGER,
  old_margin REAL,
  new_margin REAL,
  observed_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'invoice_photo'
);
`;

/** Tạo bảng nếu chưa có (idempotent — gọi nhiều lần vẫn an toàn). */
export function migrate(db: DB): void {
  db.exec(SCHEMA);
}

/** Mở DB tại `path` (dùng ":memory:" cho test). Tự tạo thư mục + chạy migrate. */
export function openDb(path: string): DB {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL"); // ghi nhanh + đọc/ghi song song tốt hơn
  migrate(db);
  return db;
}

/** Instance dùng chung cho production (đường dẫn lấy từ env). */
export const db: DB = openDb(process.env.AGENT_DB_PATH ?? "data/agent.db");
```

- [ ] **Step 4: Tạo `agent/src/store/drafts.ts`**

```ts
import type { DB } from "./db.js";

export interface DraftItemToSave {
  rawName: string;
  matchedProductId: number | null;
  quantity: number;
  unit: string;
  costPrice: number;
  expiryDate: string | null;
}

export interface PriceObservationToSave {
  productId: number | null;
  rawName: string;
  observedCostPrice: number;
  previousCostPrice: number | null;
  pctChange: number | null;
  sellPrice: number | null;
  oldMargin: number | null;
  newMargin: number | null;
}

export interface DraftToSave {
  supplierName: string;
  rawJson: string;
  items: DraftItemToSave[];
  observations: PriceObservationToSave[];
}

/** Lưu 1 draft + items + observations trong 1 transaction. Trả về draftId. */
export function saveDraft(db: DB, draft: DraftToSave): number {
  const insertDraft = db.prepare(
    "INSERT INTO draft_invoices (supplier_name, raw_json) VALUES (?, ?)",
  );
  const insertItem = db.prepare(
    `INSERT INTO draft_invoice_items
       (draft_id, raw_name, matched_product_id, quantity, unit, cost_price, expiry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertObs = db.prepare(
    `INSERT INTO price_observations
       (product_id, raw_name, observed_cost_price, previous_cost_price, pct_change, sell_price, old_margin, new_margin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  // transaction: hoặc lưu hết, hoặc không lưu gì (tránh draft lưu nửa chừng).
  const tx = db.transaction((d: DraftToSave): number => {
    const draftId = Number(insertDraft.run(d.supplierName, d.rawJson).lastInsertRowid);
    for (const it of d.items) {
      insertItem.run(draftId, it.rawName, it.matchedProductId, it.quantity, it.unit, it.costPrice, it.expiryDate);
    }
    for (const o of d.observations) {
      insertObs.run(
        o.productId,
        o.rawName,
        o.observedCostPrice,
        o.previousCostPrice,
        o.pctChange,
        o.sellPrice,
        o.oldMargin,
        o.newMargin,
      );
    }
    return draftId;
  });

  return tx(draft);
}
```

- [ ] **Step 5: Chạy test → PASS**

Run: `cd agent && npx vitest run test/invoice-store.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add agent/src/store/db.ts agent/src/store/drafts.ts agent/test/invoice-store.test.ts
git commit -m "feat: add SQLite store for invoice drafts and price observations"
```

---

## Task 5: `invoice/core.ts` — orchestrate `processInvoice` (TDD)

**Files:**
- Test: `agent/test/invoice-core.test.ts`
- Create: `agent/src/invoice/core.ts`

> **`processInvoice(input, deps)`** ráp mọi thứ: match từng item → lấy lô mới nhất để biết giá vốn cũ → tính cảnh báo giá → lưu nháp → trả **string tóm tắt** (LLM đọc string này để trả lời user). Nhận `deps` (DI) gồm `listProducts`, `listBatches`, `saveDraft` → test bằng deps giả, không cần backend/DB thật.

- [ ] **Step 1: Viết test thất bại** — `agent/test/invoice-core.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { processInvoice, type InvoiceDeps } from "../src/invoice/core";
import type { DraftToSave } from "../src/store/drafts";

const products = [
  { id: 1, name: "Coca Cola lon 330ml", sell_price: 12000, unit: "lon" },
  { id: 2, name: "Mì Hảo Hảo tôm chua cay", sell_price: 4000, unit: "gói" },
];

function makeDeps(overrides: Partial<InvoiceDeps> = {}) {
  let saved: DraftToSave | null = null;
  const deps: InvoiceDeps = {
    listProducts: async () => products,
    listBatches: async (id) => (id === 1 ? [{ cost_price: 8000, received_at: "2026-05-01" }] : []),
    saveDraft: (d) => {
      saved = d;
      return 7;
    },
    ...overrides,
  };
  return { deps, getSaved: () => saved };
}

describe("processInvoice", () => {
  it("item khớp + có giá vốn cũ → tóm tắt báo % thay đổi + lưu nháp", async () => {
    const { deps, getSaved } = makeDeps();
    const summary = await processInvoice(
      { supplierName: "NCC A", items: [{ name: "Coca", quantity: 10, unit: "lon", costPrice: 9000, expiryDate: null }] },
      deps,
    );

    expect(summary).toContain("#7");
    expect(summary).toContain("Coca Cola lon 330ml");
    expect(summary).toContain("TĂNG"); // 8000 -> 9000 = +12.5%
    expect(summary).toContain("NHÁP");

    const saved = getSaved()!;
    expect(saved.items[0].matchedProductId).toBe(1);
    expect(saved.observations[0].pctChange).toBeCloseTo(12.5);
  });

  it("item khớp nhưng chưa có lô nào → báo 'lần đầu có giá vốn'", async () => {
    const { deps } = makeDeps();
    const summary = await processInvoice(
      { supplierName: "NCC A", items: [{ name: "Mì Hảo Hảo", quantity: 30, unit: "gói", costPrice: 3000, expiryDate: null }] },
      deps,
    );
    expect(summary).toContain("lần đầu");
  });

  it("item không khớp → đánh dấu hàng mới, lưu với matchedProductId null", async () => {
    const { deps, getSaved } = makeDeps();
    const summary = await processInvoice(
      { supplierName: "NCC A", items: [{ name: "Bánh quy bơ", quantity: 5, unit: "hộp", costPrice: 20000, expiryDate: null }] },
      deps,
    );
    expect(summary).toContain("CHƯA khớp");
    expect(getSaved()!.items[0].matchedProductId).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd agent && npx vitest run test/invoice-core.test.ts`
Expected: FAIL — `Cannot find module '../src/invoice/core'`.

- [ ] **Step 3: Tạo `agent/src/invoice/core.ts`**

```ts
import { matchProduct, type MatchResult, type ProductLite } from "./match.js";
import { computePriceAlert, type PriceAlert } from "./pricing.js";
import type { DraftItemToSave, DraftToSave, PriceObservationToSave } from "../store/drafts.js";

export interface InvoiceItemInput {
  name: string;
  quantity: number;
  unit: string;
  costPrice: number;
  expiryDate: string | null;
}

export interface InvoiceInput {
  supplierName: string;
  items: InvoiceItemInput[];
}

export interface BatchLite {
  cost_price: number;
  received_at: string;
}

/** Dependencies tiêm vào — production dùng taphoa API + SQLite, test dùng đồ giả. */
export interface InvoiceDeps {
  listProducts(): Promise<ProductLite[]>;
  listBatches(productId: number): Promise<BatchLite[]>;
  saveDraft(draft: DraftToSave): number;
}

function vnd(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

function pct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

/** Trong các lô đang còn, lấy lô nhập GẦN NHẤT (received_at lớn nhất). */
export function pickLatestBatch(batches: BatchLite[]): BatchLite | null {
  if (batches.length === 0) return null;
  return batches.reduce((a, b) => (new Date(b.received_at) > new Date(a.received_at) ? b : a));
}

function formatMatchedLine(it: InvoiceItemInput, productName: string, alert: PriceAlert): string {
  let line = `✅ ${it.name} → "${productName}": ${it.quantity} ${it.unit} @ ${vnd(it.costPrice)}`;
  if (alert.pctChange === null) {
    line += " (lần đầu có giá vốn, chưa so sánh được)";
  } else if (alert.direction === "up") {
    line += ` — ⬆️ giá vốn TĂNG ${pct(alert.pctChange)} (trước: ${vnd(alert.previousCost!)})`;
  } else if (alert.direction === "down") {
    line += ` — ⬇️ giá vốn GIẢM ${pct(alert.pctChange)} (trước: ${vnd(alert.previousCost!)})`;
  } else {
    line += " — giá vốn không đổi";
  }
  if (alert.newMargin !== null) {
    const oldM = alert.oldMargin !== null ? `${(alert.oldMargin * 100).toFixed(0)}%→` : "";
    line += `. Biên LN: ${oldM}${(alert.newMargin * 100).toFixed(0)}%`;
  }
  return line;
}

function formatUnmatchedLine(it: InvoiceItemInput, m: MatchResult): string {
  if (m.status === "ambiguous") {
    const names = m.candidates.map((c) => `"${c.name}"`).join(" hoặc ");
    return `❓ ${it.name}: KHỚP NHIỀU sản phẩm (${names}) — cần bạn chọn, chưa so giá.`;
  }
  const hint = m.candidates.length ? ` (gần nhất: "${m.candidates[0].name}")` : "";
  return `🆕 ${it.name}: CHƯA khớp sản phẩm nào${hint} — có thể là hàng mới.`;
}

export async function processInvoice(input: InvoiceInput, deps: InvoiceDeps): Promise<string> {
  const products = await deps.listProducts();

  const items: DraftItemToSave[] = [];
  const observations: PriceObservationToSave[] = [];
  const lines: string[] = [];

  for (const it of input.items) {
    const m = matchProduct(it.name, products);

    if (m.status === "matched" && m.productId !== null) {
      const batches = await deps.listBatches(m.productId);
      const latest = pickLatestBatch(batches);
      const previousCost = latest ? latest.cost_price : null;
      const alert = computePriceAlert({ sellPrice: m.sellPrice, previousCost, newCost: it.costPrice });

      items.push({
        rawName: it.name,
        matchedProductId: m.productId,
        quantity: it.quantity,
        unit: it.unit,
        costPrice: it.costPrice,
        expiryDate: it.expiryDate,
      });
      observations.push({
        productId: m.productId,
        rawName: it.name,
        observedCostPrice: it.costPrice,
        previousCostPrice: previousCost,
        pctChange: alert.pctChange,
        sellPrice: m.sellPrice,
        oldMargin: alert.oldMargin,
        newMargin: alert.newMargin,
      });
      lines.push(formatMatchedLine(it, m.productName!, alert));
    } else {
      // ambiguous / unmatched: vẫn lưu item (matchedProductId null), không so giá.
      items.push({
        rawName: it.name,
        matchedProductId: null,
        quantity: it.quantity,
        unit: it.unit,
        costPrice: it.costPrice,
        expiryDate: it.expiryDate,
      });
      observations.push({
        productId: null,
        rawName: it.name,
        observedCostPrice: it.costPrice,
        previousCostPrice: null,
        pctChange: null,
        sellPrice: null,
        oldMargin: null,
        newMargin: null,
      });
      lines.push(formatUnmatchedLine(it, m));
    }
  }

  const draftId = deps.saveDraft({
    supplierName: input.supplierName,
    rawJson: JSON.stringify(input),
    items,
    observations,
  });

  const header = `📋 Đã lưu NHÁP đơn nhập #${draftId} từ NCC "${input.supplierName}" (${input.items.length} mặt hàng):`;
  return [header, ...lines, "", "⚠️ Đây là bản NHÁP để bạn kiểm tra — agent CHƯA ghi vào kho thật."].join("\n");
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd agent && npx vitest run test/invoice-core.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/src/invoice/core.ts agent/test/invoice-core.test.ts
git commit -m "feat: orchestrate invoice processing (match + price alert + draft)"
```

---

## Task 6: `invoice/tool.ts` + nối vào graph + system prompt

**Files:**
- Create: `agent/src/invoice/tool.ts`
- Modify: `agent/src/graph/graph.ts`
- Modify: `agent/src/prompts/system.ts`

> `tool.ts` là lớp mỏng: nối `deps` thật (taphoa API + SQLite) vào `processInvoice`. Schema của tool chính là cấu trúc hóa đơn → Gemini đọc ảnh rồi điền vào = bước trích xuất. `listProducts` phải LẶP QUA CÁC TRANG vì `/products` phân trang (limit tối đa 100).

- [ ] **Step 1: Tạo `agent/src/invoice/tool.ts`**

```ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { taphoa } from "../taphoa/client.js";
import { db } from "../store/db.js";
import { saveDraft } from "../store/drafts.js";
import { processInvoice, type BatchLite, type InvoiceDeps } from "./core.js";
import type { ProductLite } from "./match.js";

/** /products có phân trang (limit tối đa 100) → lặp tới khi hết để lấy toàn bộ catalog. */
async function listAllProducts(): Promise<ProductLite[]> {
  const all: ProductLite[] = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await taphoa.get<ProductLite[]>("/products", { page, limit: 100 });
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

const deps: InvoiceDeps = {
  listProducts: listAllProducts,
  listBatches: (productId) => taphoa.get<BatchLite[]>(`/products/${productId}/batches`),
  saveDraft: (draft) => saveDraft(db, draft),
};

export const recordPurchaseInvoice = tool(
  async (input) => processInvoice(input, deps),
  {
    name: "record_purchase_invoice",
    description:
      "Ghi nhận HÓA ĐƠN NHẬP HÀNG từ ẢNH. Khi người dùng GỬI ẢNH hóa đơn/phiếu nhập hàng, hãy ĐỌC ảnh rồi trích xuất: tên nhà cung cấp + từng mặt hàng (tên, số lượng, đơn vị, GIÁ NHẬP cho 1 đơn vị, hạn dùng nếu có) và gọi tool này. Tool sẽ tự đối chiếu với sản phẩm trong cửa hàng, CẢNH BÁO nếu giá nhập thay đổi so với lần trước, rồi lưu BẢN NHÁP. Tool KHÔNG ghi vào kho thật.",
    schema: z.object({
      supplierName: z.string().describe("Tên nhà cung cấp ghi trên hóa đơn. Không rõ thì để 'Không rõ'."),
      items: z
        .array(
          z.object({
            name: z.string().describe("Tên mặt hàng đọc trên hóa đơn"),
            quantity: z.number().describe("Số lượng nhập"),
            unit: z.string().describe("Đơn vị: lon, chai, thùng, gói, kg..."),
            costPrice: z
              .number()
              .describe("GIÁ NHẬP cho 1 đơn vị (VND, số nguyên). Nếu hóa đơn ghi thành tiền cả dòng thì chia cho số lượng."),
            expiryDate: z.string().nullable().describe("Hạn dùng dạng YYYY-MM-DD nếu có, không thì null."),
          }),
        )
        .describe("Danh sách mặt hàng trên hóa đơn"),
    }),
  },
);
```

- [ ] **Step 2: Sửa `agent/src/graph/graph.ts`** để thêm tool mới

Thay đoạn import + dựng `llmWithTools` + `toolNode`. Cụ thể:

Thêm import (sau dòng import `readTools`):
```ts
import { recordPurchaseInvoice } from "../invoice/tool.js";
```

Đổi dòng:
```ts
const llmWithTools = getLLM().bindTools(readTools);
```
thành:
```ts
const allTools = [...readTools, recordPurchaseInvoice];
const llmWithTools = getLLM().bindTools(allTools);
```

Đổi dòng:
```ts
const toolNode = new ToolNode(readTools);
```
thành:
```ts
const toolNode = new ToolNode(allTools);
```

(File sau khi sửa — đối chiếu để chắc:)
```ts
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import type { AIMessage } from "@langchain/core/messages";
import { getLLM } from "../llm.js";
import { readTools } from "../tools/taphoa-read.js";
import { recordPurchaseInvoice } from "../invoice/tool.js";
import { buildSystemMessage } from "../prompts/system.js";

const allTools = [...readTools, recordPurchaseInvoice];
const llmWithTools = getLLM().bindTools(allTools);

async function agentNode(state: typeof MessagesAnnotation.State) {
  const response = await llmWithTools.invoke([buildSystemMessage(), ...state.messages]);
  return { messages: [response] };
}

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  return last.tool_calls && last.tool_calls.length > 0 ? "tools" : END;
}

const toolNode = new ToolNode(allTools);

export const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent")
  .compile();
```

- [ ] **Step 3: Sửa `agent/src/prompts/system.ts`** — thêm hướng dẫn về ảnh hóa đơn

Trong mảng string của `buildSystemMessage()`, thêm 1 dòng trước dòng cuối ("Luôn dùng tool..."):
```ts
      "Khi người dùng GỬI ẢNH hóa đơn/phiếu nhập hàng, hãy ĐỌC ảnh và gọi tool record_purchase_invoice (trích xuất NCC + từng mặt hàng). Không tự bịa số liệu trên ảnh.",
```

- [ ] **Step 4: Smoke check biên dịch**

Run: `cd agent && npx tsc --noEmit`
Expected: không có lỗi type.

- [ ] **Step 5: Chạy lại toàn bộ test** (đảm bảo không vỡ gì)

Run: `cd agent && npm test`
Expected: tất cả test PASS.

- [ ] **Step 6: Commit**

```bash
git add agent/src/invoice/tool.ts agent/src/graph/graph.ts agent/src/prompts/system.ts
git commit -m "feat: wire invoice photo tool into the agent graph"
```

---

## Task 7: `scripts/invoice.ts` — harness test ảnh (không cần UI)

**Files:**
- Create: `agent/scripts/invoice.ts`

> Phase 3 mới làm UI. Tạm thời script này đọc 1 ảnh local → base64 → gửi vào graph dưới dạng **multimodal message** (text + image). Đây là cách test lặp lại được trước khi có UI.

- [ ] **Step 1: Tạo `agent/scripts/invoice.ts`**

```ts
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
    { type: "image_url", image_url: `data:${mime};base64,${b64}` },
  ],
});

const result = await graph.invoke({ messages: [message] });
const last = result.messages.at(-1);
console.log("\n🤖 Agent:\n", typeof last?.content === "string" ? last.content : JSON.stringify(last?.content, null, 2));
```

- [ ] **Step 2: Smoke check biên dịch**

Run: `cd agent && npx tsc --noEmit`
Expected: không có lỗi type.

- [ ] **Step 3: Commit**

```bash
git add agent/scripts/invoice.ts
git commit -m "chore: add CLI harness to test invoice photo extraction"
```

---

## Task 8: Verification cuối Phase 2 (làm tay)

> Cần backend chạy + `.env` đầy đủ + ảnh hóa đơn thật trong `test-fixtures/`.

- [ ] **Step 1: Chạy toàn bộ unit test**

Run: `cd agent && npm test`
Expected: tất cả test PASS (match, pricing, store, core, + test Phase 1).

- [ ] **Step 2: Test ảnh bằng CLI harness**

Run: `cd agent && npm run invoice -- ./test-fixtures/hoadon1.jpg`
Expected: agent in ra bản tóm tắt: số nháp `#N`, từng mặt hàng (✅ khớp / ❓ mơ hồ / 🆕 hàng mới), cảnh báo giá vốn ⬆️/⬇️ nếu có, và dòng "CHƯA ghi vào kho thật".

- [ ] **Step 3: Kiểm tra DB đã lưu nháp**

Run: `cd agent && npx tsx -e "import('better-sqlite3').then(({default:D})=>{const db=new D(process.env.AGENT_DB_PATH||'data/agent.db');console.log('drafts:',db.prepare('SELECT * FROM draft_invoices').all());console.log('items:',db.prepare('SELECT * FROM draft_invoice_items').all());console.log('obs:',db.prepare('SELECT raw_name,observed_cost_price,previous_cost_price,pct_change FROM price_observations').all());})"`
Expected: thấy bản ghi draft + items + observations vừa tạo.

- [ ] **Step 4: Test trong LangGraph Studio** (xem graph chạy trực quan)

Run: `cd agent && npm run dev` → mở link Studio.
Trong Studio: đính kèm 1 ảnh hóa đơn + gõ "ghi đơn nhập này". Quan sát: node `agent` → `tools` (gọi `record_purchase_invoice`) → `agent` → trả lời. Mở LangSmith xem trace nếu đã bật.

- [ ] **Step 5: Định nghĩa "xong" (Definition of Done Phase 2):**
  - [ ] `npm test` xanh (gồm 4 test mới).
  - [ ] Gửi ảnh hóa đơn (qua `npm run invoice` hoặc Studio) → agent gọi `record_purchase_invoice`, KHÔNG bịa số.
  - [ ] Item khớp được sản phẩm → có cảnh báo giá vốn (⬆️/⬇️/lần đầu) + biên LN.
  - [ ] Item tên mơ hồ → liệt kê ứng viên, KHÔNG đoán bừa.
  - [ ] Item lạ → đánh dấu "hàng mới".
  - [ ] DB SQLite có draft + items + price_observations.
  - [ ] Câu hỏi đọc dữ liệu (Phase 1) vẫn chạy bình thường.

- [ ] **Step 6: Nếu agent trích xuất sai / gọi nhầm tool:** chỉnh `description` của tool và schema `.describe(...)` cho rõ hơn (đây là cách "debug" chính ở tầng tool — giống Phase 1).

---

## Self-Review (đã kiểm)

- **Spec coverage:**
  - Mục 6.4 (`record_purchase_invoice`: schema = hóa đơn, match, so giá, lưu draft, return string tóm tắt, ambiguity → liệt kê) → Task 2-6. ✅
  - Mục 7 (SQLite: `draft_invoices`, `draft_invoice_items`, `price_observations`) → Task 4. ✅
  - Mục 6.5 (`taphoa/client.ts`) → tái dùng từ Phase 1 (`listBatches`/`listProducts` qua `taphoa.get`). ✅
  - Mục 8 (chạy + test) → Task 7 (CLI) + Task 8 (Studio). ✅
  - **Lệch có chủ đích:** giá vốn lấy từ `/products/:id/batches` thay vì `/price-history` (spec sai — đã giải thích ở đầu plan). Layout gom vào `src/invoice/` thay vì `tools/invoice.ts` (để test pure functions).
  - **Ngoài phạm vi (đúng spec):** v2 `interrupt`/ghi kho thật, UI (Phase 3).
- **Placeholder scan:** không có TBD/TODO; mọi step có code/lệnh cụ thể + expected output.
- **Type consistency:** `ProductLite` định nghĩa ở `match.ts`, dùng lại ở `core.ts` + `tool.ts`. `BatchLite`/`InvoiceDeps`/`InvoiceInput` định nghĩa ở `core.ts`, dùng ở `tool.ts` + test. `DraftToSave`/`DraftItemToSave`/`PriceObservationToSave` định nghĩa ở `store/drafts.ts`, dùng ở `core.ts` + test. `PriceAlert` từ `pricing.ts` dùng ở `core.ts`. `saveDraft(db, draft)` chữ ký nhất quán giữa `drafts.ts` → `core.ts` (qua deps) → `tool.ts`. `matchProduct` trả `MatchResult` dùng ở `core.ts`. Tất cả khớp.

---

## Next

Sau khi Phase 2 đạt Definition of Done → **Plan Phase 3**: dựng Agent Chat UI (`langchain-ai/agent-chat-ui`) trỏ tới `http://localhost:2024`, mở qua tunnel để chụp ảnh từ điện thoại (mục 8 của spec). (v2 về sau: `interrupt` để biến nháp thành đơn nhập thật.)
```
