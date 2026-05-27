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
