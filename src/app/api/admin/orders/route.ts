import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { orderManagementQuerySchema } from "@/lib/validations/order-management";

const PAGE_SIZE = 30;

export async function GET(request: Request) {
  const actor = await requireRole(rolePermissions.orderOperations, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }

  const params = new URL(request.url).searchParams;
  const parsed = orderManagementQuerySchema.safeParse({
    page: params.get("page") ?? undefined,
    status: params.get("status") ?? undefined,
    q: params.get("q") ?? undefined,
    type: params.get("type") ?? undefined,
    employeeId: params.get("employeeId") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bộ lọc đơn hàng không hợp lệ" }, { status: 400 });
  }

  const filters: Prisma.OrderWhereInput[] = [];
  if (parsed.data.status) {
    filters.push({ status: parsed.data.status });
  }
  if (parsed.data.type) filters.push({ type: parsed.data.type });
  if (parsed.data.from || parsed.data.to) {
    const dateFilter: Prisma.DateTimeFilter<"Order"> = {};
    if (parsed.data.from) {
      dateFilter.gte = new Date(`${parsed.data.from}T00:00:00+07:00`);
    }
    if (parsed.data.to) {
      dateFilter.lt = new Date(
        new Date(`${parsed.data.to}T00:00:00+07:00`).getTime() +
          24 * 60 * 60 * 1000,
      );
    }
    filters.push({ createdAt: dateFilter });
  }
  if (parsed.data.employeeId) {
    filters.push({
      OR: [
        { createdById: parsed.data.employeeId },
        { assignedCashierId: parsed.data.employeeId },
        { assignedBaristaId: parsed.data.employeeId },
      ],
    });
  }
  if (parsed.data.q) {
    filters.push({
      OR: [
        { code: { contains: parsed.data.q, mode: "insensitive" } },
        ...(actor.role === "BARISTA"
          ? []
          : [
              {
                customerName: {
                  contains: parsed.data.q,
                  mode: "insensitive" as const,
                },
              },
              {
                customerPhone: {
                  contains: parsed.data.q,
                  mode: "insensitive" as const,
                },
              },
            ]),
      ],
    });
  }
  if (actor.role === "CASHIER") {
    filters.push({
      OR: [{ assignedCashierId: actor.id }, { createdById: actor.id }],
    });
    filters.push({
      status: {
        in: [
          "PENDING",
          "CONFIRMED",
          "READY",
          "SERVED",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
        ],
      },
    });
  }
  if (actor.role === "BARISTA") {
    filters.push({ assignedBaristaId: actor.id });
    filters.push({ status: { in: ["CONFIRMED", "PREPARING", "READY"] } });
  }
  const where: Prisma.OrderWhereInput = { AND: filters };

  try {
    if (actor.role === "BARISTA") {
      const [orders, total] = await prisma.$transaction([
        prisma.order.findMany({
          where,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          skip: (parsed.data.page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            code: true,
            status: true,
            type: true,
            note: true,
            statusUpdatedAt: true,
            createdAt: true,
            items: {
              select: {
                name: true,
                quantity: true,
                note: true,
                options: true,
              },
            },
          },
        }),
        prisma.order.count({ where }),
      ]);
      return NextResponse.json({ orders, page: parsed.data.page, pageSize: PAGE_SIZE, total });
    }

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          code: true,
          status: true,
          paymentStatus: true,
          type: true,
          customerName: true,
          customerPhone: true,
          address: true,
          note: true,
          subtotal: true,
          discount: true,
          deliveryFee: true,
          total: true,
          statusUpdatedAt: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, role: true } },
          assignedCashier: { select: { id: true, name: true } },
          assignedBarista: { select: { id: true, name: true } },
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              unitPrice: true,
              note: true,
              options: true,
            },
          },
          payment: {
            select: {
              method: true,
              status: true,
              amount: true,
              amountTendered: true,
              changeDue: true,
              refundedAmount: true,
              paidAt: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return NextResponse.json({ orders, page: parsed.data.page, pageSize: PAGE_SIZE, total });
  } catch (error) {
    console.error("Failed to fetch staff orders:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách đơn hàng" },
      { status: 500 },
    );
  }
}
