import { describe, expect, it } from "vitest";
import {
  canManageRole,
  canTransitionOrder,
  getVisibleAdminNavigation,
  rolePermissions,
} from "./permissions";

describe("role permissions", () => {
  it("limits manager account assignment to cashier and barista", () => {
    expect(canManageRole("MANAGER", "CASHIER")).toBe(true);
    expect(canManageRole("MANAGER", "BARISTA")).toBe(true);
    expect(canManageRole("MANAGER", "ADMIN")).toBe(false);
    expect(canManageRole("MANAGER", "CUSTOMER")).toBe(false);
    expect(canManageRole("CUSTOMER", "CASHIER")).toBe(false);
  });

  it("limits counter order creation to cashier and admin staff", () => {
    expect(rolePermissions.counterOrders).toEqual(["ADMIN", "CASHIER"]);
    expect(rolePermissions.counterOrders).not.toContain("MANAGER");
    expect(rolePermissions.counterOrders).not.toContain("BARISTA");
  });

  it("shows staff navigation only for sections their role can access", () => {
    const cashierLinks = getVisibleAdminNavigation("CASHIER").map(
      (item) => item.href,
    );
    const managerLinks = getVisibleAdminNavigation("MANAGER").map(
      (item) => item.href,
    );
    const adminLinks = getVisibleAdminNavigation("ADMIN").map(
      (item) => item.href,
    );
    expect(cashierLinks).toContain("/admin/orders");
    expect(cashierLinks).toContain("/cashier");
    expect(cashierLinks).not.toContain("/admin");
    expect(cashierLinks).not.toContain("/admin/staff");
    expect(cashierLinks).not.toContain("/admin/settings");
    expect(managerLinks).toContain("/admin/reports");
    expect(managerLinks).not.toContain("/admin/settings");
    expect(managerLinks).not.toContain("/admin/reviews");
    expect(adminLinks).toContain("/admin/settings");
    expect(adminLinks).toContain("/admin/reviews");
  });

  it("enforces role-specific order transitions", () => {
    expect(
      canTransitionOrder("CASHIER", "PENDING", "CONFIRMED", "TAKEAWAY"),
    ).toBe(true);
    expect(
      canTransitionOrder("CUSTOMER", "PENDING", "CANCELLED", "TAKEAWAY"),
    ).toBe(true);
    expect(
      canTransitionOrder("CUSTOMER", "PENDING", "CONFIRMED", "TAKEAWAY"),
    ).toBe(false);
    expect(
      canTransitionOrder("CASHIER", "PENDING", "CANCELLED", "TAKEAWAY"),
    ).toBe(true);
    expect(
      canTransitionOrder("CASHIER", "CONFIRMED", "CANCELLED", "TAKEAWAY"),
    ).toBe(true);
    expect(
      canTransitionOrder("BARISTA", "PREPARING", "CANCELLED", "TAKEAWAY"),
    ).toBe(false);
    expect(
      canTransitionOrder("BARISTA", "PENDING", "CONFIRMED", "TAKEAWAY"),
    ).toBe(false);
    expect(
      canTransitionOrder("BARISTA", "CONFIRMED", "PREPARING", "TAKEAWAY"),
    ).toBe(true);
    expect(
      canTransitionOrder("BARISTA", "PREPARING", "READY", "TAKEAWAY"),
    ).toBe(true);
    expect(
      canTransitionOrder("CASHIER", "READY", "SERVED", "TAKEAWAY"),
    ).toBe(true);
    expect(
      canTransitionOrder("CASHIER", "READY", "SERVED", "DELIVERY"),
    ).toBe(false);
    expect(
      canTransitionOrder("CASHIER", "READY", "OUT_FOR_DELIVERY", "DELIVERY"),
    ).toBe(true);
    expect(
      canTransitionOrder("CASHIER", "OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY"),
    ).toBe(true);
    expect(
      canTransitionOrder("CASHIER", "SERVED", "COMPLETED", "TAKEAWAY"),
    ).toBe(true);
    expect(
      canTransitionOrder("CASHIER", "SERVED", "COMPLETED", "DELIVERY"),
    ).toBe(false);
    expect(
      canTransitionOrder("MANAGER", "PREPARING", "CANCELLED", "TAKEAWAY"),
    ).toBe(true);
    expect(
      canTransitionOrder("CASHIER", "PENDING", "COMPLETED", "TAKEAWAY"),
    ).toBe(false);
    expect(
      canTransitionOrder("CASHIER", "COMPLETED", "REFUNDED", "TAKEAWAY"),
    ).toBe(false);
    expect(
      canTransitionOrder("MANAGER", "COMPLETED", "REFUNDED", "TAKEAWAY"),
    ).toBe(true);
  });
});
