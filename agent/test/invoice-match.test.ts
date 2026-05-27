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
