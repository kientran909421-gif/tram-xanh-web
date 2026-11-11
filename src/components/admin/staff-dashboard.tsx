import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { AuthRole } from "@/lib/auth.config";
import { requireRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { staffDashboardActions } from "@/lib/permissions";

type DashboardRole = Exclude<AuthRole, "CUSTOMER">;

const dashboardTitles: Record<DashboardRole, string> = {
  ADMIN: "Tổng quan hệ thống",
  MANAGER: "Vận hành cửa hàng",
  CASHIER: "Quầy thu ngân",
  BARISTA: "Hàng đợi pha chế",
};

export async function StaffDashboard({
  role,
  allowedRoles,
}: {
  role: DashboardRole;
  allowedRoles: readonly AuthRole[];
}) {
  const actor = await requireRole(allowedRoles, "page", "/");
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(now);
  const dayStart = new Date(`${date}T00:00:00+07:00`);
  const todayFilter = { createdAt: { gte: dayStart } };

  let metrics: { label: string; value: string | number }[] = [];
  if (role === "ADMIN" || role === "MANAGER") {
    const [ordersToday, waitingOrders, completedOrders, revenue, ingredients] =
      await Promise.all([
        prisma.order.count({ where: todayFilter }),
        prisma.order.count({
          where: { ...todayFilter, status: { in: ["PENDING", "CONFIRMED"] } },
        }),
        prisma.order.count({ where: { ...todayFilter, status: "COMPLETED" } }),
        prisma.order.aggregate({
          where: {
            ...todayFilter,
            payment: { is: { status: "PAID" } },
          },
          _sum: { total: true },
        }),
        prisma.inventoryIngredient.findMany({
          where: { isActive: true },
          select: { quantityOnHand: true, lowStockAt: true },
        }),
      ]);
    const lowStock = ingredients.filter((ingredient) =>
      ingredient.quantityOnHand.lte(ingredient.lowStockAt),
    ).length;
    metrics = [
      { label: "Đơn hôm nay", value: ordersToday },
      { label: "Đơn chờ xử lý", value: waitingOrders },
      { label: "Đơn hoàn thành", value: completedOrders },
      {
        label: "Doanh thu đã thanh toán",
        value: `${(revenue._sum.total ?? 0).toLocaleString("vi-VN")}đ`,
      },
      { label: "Nguyên liệu cần nhập", value: lowStock },
    ];
  } else if (role === "CASHIER") {
    const scope = {
      OR: [{ assignedCashierId: actor.id }, { createdById: actor.id }],
    };
    const [waiting, today] = await Promise.all([
      prisma.order.count({
        where: {
          ...scope,
          status: { in: ["PENDING", "CONFIRMED", "READY"] },
        },
      }),
      prisma.order.count({ where: { ...scope, ...todayFilter } }),
    ]);
    metrics = [
      { label: "Đơn trong phạm vi", value: today },
      { label: "Đơn cần xử lý", value: waiting },
    ];
  } else {
    const scope = { assignedBaristaId: actor.id };
    const [waiting, preparing, ready] = await Promise.all([
      prisma.order.count({
        where: { ...scope, status: { in: ["CONFIRMED", "PENDING"] } },
      }),
      prisma.order.count({ where: { ...scope, status: "PREPARING" } }),
      prisma.order.count({ where: { ...scope, status: "READY" } }),
    ]);
    metrics = [
      { label: "Đơn chờ pha chế", value: waiting },
      { label: "Đang pha chế", value: preparing },
      { label: "Đã pha xong", value: ready },
    ];
  }

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Xin chào, {actor.name || actor.email}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          {dashboardTitles[role]}
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <section
              key={metric.label}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {metric.value}
              </p>
            </section>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          {staffDashboardActions[role].map((action) => (
            <Button
              key={action.href}
              variant="outline"
              render={<Link href={action.href} />}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </main>
  );
}
