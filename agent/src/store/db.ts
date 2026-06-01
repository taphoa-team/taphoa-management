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
