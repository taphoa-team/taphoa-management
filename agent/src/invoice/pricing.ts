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
