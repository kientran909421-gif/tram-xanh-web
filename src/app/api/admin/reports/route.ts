import { NextResponse } from "next/server";
import { z } from "zod";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const querySchema = z.object({
  period: z.enum(["day", "week", "month"]).default("day"),
});
const REPORT_LIMIT = 10_000;

function getStartDate(period: "day" | "week" | "month") {
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
  const today = new Date(`${localDate}T00:00:00+07:00`);
  const days = period === "day" ? 1 : period === "week" ? 7 : 30;
  return new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
}

export async function GET(request: Request) {
  const access = await requireRole(rolePermissions.reports, "api");
  if (access instanceof NextResponse) {
    return access;
  }
  const parsed = querySchema.safeParse({
    period: new URL(request.url).searchParams.get("period") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Khoảng thời gian không hợp lệ" }, { status: 400 });
  }
  const start = getStartDate(parsed.data.period);
  try {
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start } },
      orderBy: { createdAt: "desc" },
      take: REPORT_LIMIT,
      select: {
        id: true,
        total: true,
        subtotal: true,
        discount: true,
        status: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, role: true } },
        payment: { select: { status: true } },
        items: {
          select: {
            name: true,
            quantity: true,
            unitPrice: true,
            menuItem: { select: { category: { select: { name: true } } } },
          },
        },
      },
    });

    const paidOrders = orders.filter((order) => order.payment?.status === "PAID");
    const topProducts = new Map<string, { quantity: number; revenue: number }>();
    const categoryRevenue = new Map<string, number>();
    const employeeTotals = new Map<
      string,
      { name: string; orders: number; revenue: number }
    >();
    for (const order of paidOrders) {
      const grossItems = order.items.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      );
      const netItemRevenue = Math.max(0, order.subtotal - order.discount);
      const itemRevenueRatio = grossItems > 0 ? netItemRevenue / grossItems : 0;
      for (const item of order.items) {
        const product = topProducts.get(item.name) ?? { quantity: 0, revenue: 0 };
        product.quantity += item.quantity;
        const itemRevenue = item.unitPrice * item.quantity * itemRevenueRatio;
        product.revenue += itemRevenue;
        topProducts.set(item.name, product);
        const category = item.menuItem.category.name;
        categoryRevenue.set(
          category,
          (categoryRevenue.get(category) ?? 0) + itemRevenue,
        );
      }
      if (
        order.createdBy &&
        ["ADMIN", "MANAGER", "CASHIER"].includes(order.createdBy.role)
      ) {
        const employee = employeeTotals.get(order.createdBy.id) ?? {
          name: order.createdBy.name,
          orders: 0,
          revenue: 0,
        };
        employee.orders += 1;
        employee.revenue += order.total;
        employeeTotals.set(order.createdBy.id, employee);
      }
    }

    const statusCounts = orders.reduce<Record<string, number>>((counts, order) => {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
      return counts;
    }, {});

    return NextResponse.json({
      period: parsed.data.period,
      from: start,
      truncated: orders.length === REPORT_LIMIT,
      summary: {
        totalOrders: orders.length,
        paidOrders: paidOrders.length,
        cancelledOrders: orders.filter((order) => order.status === "CANCELLED").length,
        revenue: paidOrders.reduce((total, order) => total + order.total, 0),
        statusCounts,
      },
      topProducts: [...topProducts.entries()]
        .map(([name, value]) => ({ name, ...value }))
        .sort((left, right) => right.quantity - left.quantity)
        .slice(0, 10),
      revenueByCategory: [...categoryRevenue.entries()]
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((left, right) => right.revenue - left.revenue),
      revenueByEmployee: [...employeeTotals.entries()]
        .map(([userId, value]) => ({ userId, ...value }))
        .sort((left, right) => right.revenue - left.revenue),
    });
  } catch (error) {
    console.error("Failed to build sales report:", error);
    return NextResponse.json(
      { error: "Không thể tạo báo cáo" },
      { status: 500 },
    );
  }
}
