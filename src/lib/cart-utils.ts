import type { CartItem } from "@/stores/cart";

export type PromotionForDiscount = {
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount?: number | null;
};

export function calcSubtotal(
  items: readonly Pick<CartItem, "unitPrice" | "quantity">[],
): number {
  return items.reduce(
    (subtotal, item) => subtotal + item.unitPrice * item.quantity,
    0,
  );
}

export function calcDiscount(
  subtotal: number,
  promotion: PromotionForDiscount,
): number {
  const eligibleSubtotal = Math.max(0, Math.trunc(subtotal));
  if (eligibleSubtotal === 0) {
    return 0;
  }

  const value = Math.max(0, promotion.value);
  const rawDiscount =
    promotion.type === "PERCENT"
      ? Math.floor((eligibleSubtotal * value) / 100)
      : Math.trunc(value);
  const cappedDiscount =
    promotion.type === "PERCENT" && promotion.maxDiscount != null
      ? Math.min(rawDiscount, Math.max(0, promotion.maxDiscount))
      : rawDiscount;

  return Math.min(eligibleSubtotal, cappedDiscount);
}
