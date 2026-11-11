import { describe, expect, it } from "vitest";
import { canOperateOrder } from "./order-status.service";

const assignedOrder = {
  userId: "customer-1",
  createdById: "cashier-1",
  assignedCashierId: "cashier-1",
  assignedBaristaId: "barista-1",
};

describe("order ownership and staff scope", () => {
  it("only lets customers operate their own order", () => {
    expect(
      canOperateOrder({ id: "customer-1", role: "CUSTOMER" }, assignedOrder),
    ).toBe(true);
    expect(
      canOperateOrder({ id: "customer-2", role: "CUSTOMER" }, assignedOrder),
    ).toBe(false);
  });

  it("limits cashier and barista access to their assigned work", () => {
    expect(
      canOperateOrder({ id: "cashier-1", role: "CASHIER" }, assignedOrder),
    ).toBe(true);
    expect(
      canOperateOrder({ id: "cashier-2", role: "CASHIER" }, assignedOrder),
    ).toBe(false);
    expect(
      canOperateOrder({ id: "barista-1", role: "BARISTA" }, assignedOrder),
    ).toBe(true);
    expect(
      canOperateOrder({ id: "barista-2", role: "BARISTA" }, assignedOrder),
    ).toBe(false);
  });
});
