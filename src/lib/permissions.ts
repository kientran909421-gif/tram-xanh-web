import { authRoles, type AuthRole } from "./auth.config";

export const rolePermissions = {
  staffManagement: ["ADMIN", "MANAGER"],
  menuManagement: ["ADMIN", "MANAGER"],
  inventoryManagement: ["ADMIN", "MANAGER"],
  promotionManagement: ["ADMIN", "MANAGER"],
  storeSettings: ["ADMIN"],
  auditLog: ["ADMIN"],
  reports: ["ADMIN", "MANAGER"],
  reviewModeration: ["ADMIN"],
  orderOperations: ["ADMIN", "MANAGER", "CASHIER", "BARISTA"],
  orderAssignment: ["ADMIN", "MANAGER"],
  paymentOperations: ["ADMIN", "MANAGER", "CASHIER"],
  refund: ["ADMIN", "MANAGER"],
  counterOrders: ["ADMIN", "MANAGER", "CASHIER"],
  inventoryAlertReporting: ["BARISTA"],
} as const satisfies Record<string, readonly AuthRole[]>;

export const adminPermissions = {
  dashboard: ["ADMIN", "MANAGER", "CASHIER", "BARISTA"],
  orders: ["ADMIN", "MANAGER", "CASHIER", "BARISTA"],
  menu: ["ADMIN", "MANAGER"],
  categories: ["ADMIN", "MANAGER"],
  promotions: ["ADMIN", "MANAGER"],
  staff: ["ADMIN", "MANAGER"],
  inventory: ["ADMIN", "MANAGER"],
  settings: ["ADMIN"],
  audit: ["ADMIN"],
  reviews: ["ADMIN"],
  reports: ["ADMIN", "MANAGER"],
} as const satisfies Record<string, readonly AuthRole[]>;

export type AdminSection = keyof typeof adminPermissions;
export type StaffRole = Exclude<AuthRole, "CUSTOMER">;

export const staffDashboardActions: Record<
  StaffRole,
  { label: string; href: string }[]
> = {
  ADMIN: [
    { label: "Quản lý nhân viên", href: "/admin/staff" },
    { label: "Cấu hình cửa hàng", href: "/admin/settings" },
    { label: "Xem nhật ký", href: "/admin/audit" },
    { label: "Đánh giá khách hàng", href: "/admin/reviews" },
    { label: "Báo cáo bán hàng", href: "/admin/reports" },
  ],
  MANAGER: [
    { label: "Quản lý nhân viên", href: "/admin/staff" },
    { label: "Quản lý tồn kho", href: "/admin/inventory" },
    { label: "Xem đơn hàng", href: "/admin/orders" },
    { label: "Báo cáo bán hàng", href: "/admin/reports" },
  ],
  CASHIER: [
    { label: "Xử lý đơn hàng", href: "/admin/orders" },
    { label: "Tạo đơn tại quầy", href: "/menu" },
  ],
  BARISTA: [{ label: "Mở hàng đợi", href: "/admin/orders" }],
};

export function managedUserRoles(actor: AuthRole): AuthRole[] {
  return authRoles.filter((role) => canManageRole(actor, role));
}

export const adminNavigation: {
  section: AdminSection;
  label: string;
  href: string;
}[] = [
  { section: "dashboard", label: "Dashboard", href: "/admin" },
  { section: "orders", label: "Đơn hàng", href: "/admin/orders" },
  { section: "menu", label: "Menu", href: "/admin/menu" },
  { section: "categories", label: "Danh mục", href: "/admin/categories" },
  { section: "promotions", label: "Khuyến mãi", href: "/admin/promotions" },
  { section: "staff", label: "Nhân viên", href: "/admin/staff" },
  { section: "inventory", label: "Kho nguyên liệu", href: "/admin/inventory" },
  { section: "settings", label: "Cấu hình", href: "/admin/settings" },
  { section: "audit", label: "Nhật ký", href: "/admin/audit" },
  { section: "reviews", label: "Đánh giá", href: "/admin/reviews" },
  { section: "reports", label: "Báo cáo", href: "/admin/reports" },
];

export function canManageRole(actor: AuthRole, target: AuthRole): boolean {
  if (actor === "ADMIN") {
    return true;
  }
  return actor === "MANAGER" && (target === "CASHIER" || target === "BARISTA");
}

export function roleHomePath(role: AuthRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "MANAGER":
      return "/manager";
    case "CASHIER":
      return "/cashier";
    case "BARISTA":
      return "/barista";
    case "CUSTOMER":
      return "/";
  }
}

export function canAccessAdminSection(
  role: AuthRole,
  section: AdminSection,
): boolean {
  return (adminPermissions[section] as readonly AuthRole[]).includes(role);
}

export function getVisibleAdminNavigation(role: AuthRole) {
  return adminNavigation
    .filter((item) => canAccessAdminSection(role, item.section))
    .map((item) =>
      item.section === "dashboard"
        ? { ...item, href: roleHomePath(role) }
        : item,
    );
}

export function canTransitionOrder(
  role: AuthRole,
  from: string,
  to: string,
): boolean {
  if (from === to) {
    return false;
  }

  if (to === "CANCELLED") {
    if (role === "CASHIER") {
      return from === "PENDING";
    }
    return (
      ["ADMIN", "MANAGER"].includes(role) &&
      !["COMPLETED", "CANCELLED", "REFUNDED"].includes(from)
    );
  }
  if (to === "REFUNDED") {
    return (
      (role === "ADMIN" || role === "MANAGER") &&
      (from === "COMPLETED" || from === "CANCELLED")
    );
  }

  if (role === "ADMIN" || role === "MANAGER") {
    return (
      (from === "PENDING" && to === "CONFIRMED") ||
      (from === "CONFIRMED" && to === "PREPARING") ||
      (from === "PREPARING" && to === "READY") ||
      (from === "READY" && (to === "DELIVERING" || to === "COMPLETED")) ||
      (from === "DELIVERING" && to === "COMPLETED")
    );
  }
  if (role === "CASHIER") {
    return (
      (from === "PENDING" && to === "CONFIRMED") ||
      ((from === "READY" || from === "DELIVERING") && to === "COMPLETED")
    );
  }
  if (role === "BARISTA") {
    return (
      (from === "CONFIRMED" && to === "PREPARING") ||
      (from === "PREPARING" && to === "READY")
    );
  }
  return false;
}
