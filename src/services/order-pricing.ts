import { calcDiscount, type PromotionForDiscount } from "../lib/cart-utils";
import { DELIVERY_FEE } from "../lib/site";

export type OrderPricingInput = {
  price: number;
  quantity: number;
  options: readonly { priceDelta: number }[];
};

export type OrderPricingResult = {
  unitPrices: number[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
};

export function computeTotals(
  items: readonly OrderPricingInput[],
  promotion: PromotionForDiscount | null,
  orderType: "TAKEAWAY" | "DELIVERY",
  configuredDeliveryFee = DELIVERY_FEE,
): OrderPricingResult {
  const unitPrices = items.map(
    (item) =>
      item.price +
      item.options.reduce((total, option) => total + option.priceDelta, 0),
  );
  const subtotal = items.reduce(
    (total, item, index) => total + unitPrices[index] * item.quantity,
    0,
  );
  const discount = promotion ? calcDiscount(subtotal, promotion) : 0;
  const deliveryFee = orderType === "DELIVERY" ? configuredDeliveryFee : 0;

  return {
    unitPrices,
    subtotal,
    discount,
    deliveryFee,
    total: subtotal - discount + deliveryFee,
  };
}
