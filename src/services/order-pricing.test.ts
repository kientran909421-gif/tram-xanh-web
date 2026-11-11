import { describe, expect, it } from "vitest";
import { computeTotals } from "./order-pricing";

describe("computeTotals", () => {
  it("adds selected option prices to each item unit price", () => {
    const result = computeTotals(
      [
        {
          price: 30000,
          quantity: 2,
          options: [{ priceDelta: 7000 }, { priceDelta: 5000 }],
        },
        { price: 25000, quantity: 1, options: [] },
      ],
      null,
      "TAKEAWAY",
    );

    expect(result.unitPrices).toEqual([42000, 25000]);
    expect(result.subtotal).toBe(109000);
    expect(result.discount).toBe(0);
    expect(result.deliveryFee).toBe(0);
    expect(result.total).toBe(109000);
  });

  it("applies percentage promotions and delivery fees", () => {
    const result = computeTotals(
      [{ price: 200000, quantity: 1, options: [] }],
      { type: "PERCENT", value: 10, maxDiscount: 15000 },
      "DELIVERY",
    );

    expect(result.subtotal).toBe(200000);
    expect(result.discount).toBe(15000);
    expect(result.deliveryFee).toBe(15000);
    expect(result.total).toBe(200000);
  });

  it("applies fixed promotions and caps the total discount at subtotal", () => {
    const result = computeTotals(
      [{ price: 25000, quantity: 1, options: [] }],
      { type: "FIXED", value: 40000 },
      "TAKEAWAY",
    );

    expect(result.discount).toBe(25000);
    expect(result.total).toBe(0);
  });
});
