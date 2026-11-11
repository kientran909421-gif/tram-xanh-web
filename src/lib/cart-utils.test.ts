import { describe, expect, it } from "vitest";
import { calcDiscount, calcSubtotal } from "./cart-utils";
import type { CartItem } from "@/stores/cart";

function cartItem(
  unitPrice: number,
  quantity: number,
): Pick<CartItem, "unitPrice" | "quantity"> {
  return { unitPrice, quantity };
}

describe("calcSubtotal", () => {
  it("adds the extended prices of all cart lines", () => {
    expect(calcSubtotal([cartItem(30000, 2), cartItem(45000, 1)])).toBe(105000);
  });

  it("returns zero for an empty cart", () => {
    expect(calcSubtotal([])).toBe(0);
  });
});

describe("calcDiscount", () => {
  it("calculates a percentage discount with a maximum cap", () => {
    expect(
      calcDiscount(500000, {
        type: "PERCENT",
        value: 10,
        maxDiscount: 30000,
      }),
    ).toBe(30000);
  });

  it("calculates a percentage discount without a cap", () => {
    expect(
      calcDiscount(200000, {
        type: "PERCENT",
        value: 10,
        maxDiscount: null,
      }),
    ).toBe(20000);
  });

  it("never discounts more than the subtotal for fixed promotions", () => {
    expect(
      calcDiscount(25000, {
        type: "FIXED",
        value: 50000,
      }),
    ).toBe(25000);
  });

  it("returns zero for an empty subtotal", () => {
    expect(
      calcDiscount(0, {
        type: "PERCENT",
        value: 20,
      }),
    ).toBe(0);
  });
});
