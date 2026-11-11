import type { AuthRole } from "@/lib/auth.config";

export const adminPermissions = {
  dashboard: ["ADMIN", "MANAGER", "CASHIER", "BARISTA"],
  orders: ["ADMIN", "MANAGER", "CASHIER", "BARISTA"],
  reservations: ["ADMIN", "MANAGER", "CASHIER"],
  menu: ["ADMIN", "MANAGER"],
  categories: ["ADMIN", "MANAGER"],
  promotions: ["ADMIN", "MANAGER"],
  staff: ["ADMIN"],
} as const satisfies Record<string, readonly AuthRole[]>;

export type AdminSection = keyof typeof adminPermissions;

export const adminNavigation: {
  section: AdminSection;
  label: string;
  href: string;
}[] = [
  { section: "dashboard", label: "Dashboard", href: "/admin" },
  { section: "orders", label: "Đơn hàng", href: "/admin/orders" },
  { section: "reservations", label: "Đặt bàn", href: "/admin/reservations" },
  { section: "menu", label: "Menu", href: "/admin/menu" },
  { section: "categories", label: "Danh mục", href: "/admin/categories" },
  { section: "promotions", label: "Khuyến mãi", href: "/admin/promotions" },
  { section: "staff", label: "Nhân viên", href: "/admin/staff" },
];

export function canAccessAdminSection(
  role: AuthRole,
  section: AdminSection,
): boolean {
  return (adminPermissions[section] as readonly AuthRole[]).includes(role);
}

export function getVisibleAdminNavigation(role: AuthRole) {
  return adminNavigation.filter((item) =>
    canAccessAdminSection(role, item.section),
  );
}
