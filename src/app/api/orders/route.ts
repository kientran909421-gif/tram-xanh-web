import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { orderManagementQuerySchema } from "@/lib/validations/order-management";
import { createOrder, OrderError } from "@/services/order";
import { createOrderSchema } from "@/lib/validations/order";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { AuthRole } from "@/lib/auth.config";
import type { Session } from "next-auth";

const STAFF_PAGE_SIZE = 30;
const cashierVisibleStatuses = [
  "PENDING",
  "CONFIRMED",
  "READY",
  "SERVED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;
const baristaQueueStatuses = ["CONFIRMED", "PREPARING", "READY"] as const;

export async function GET(request: Request) {
  const actor = await requireRole(
    ["ADMIN", "MANAGER", "CASHIER", "BARISTA", "CUSTOMER"],
    "api",
  );
  if (actor instanceof NextResponse) return actor;

  const params = new URL(request.url).searchParams;
  const parsed = orderManagementQuerySchema.safeParse({
    page: params.get("page") ?? undefined,
    status: params.get("status") ?? undefined,
    q: params.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bộ lọc đơn hàng không hợp lệ" }, { status: 400 });
  }

  const filters: Prisma.OrderWhereInput[] = [];
  if (parsed.data.status) filters.push({ status: parsed.data.status });
  if (parsed.data.q) {
    filters.push({
      OR: [
        { code: { contains: parsed.data.q, mode: "insensitive" as const } },
        ...(actor.role === "BARISTA"
          ? []
          : [
              { customerName: { contains: parsed.data.q, mode: "insensitive" as const } },
              { customerPhone: { contains: parsed.data.q, mode: "insensitive" as const } },
            ]),
      ],
    });
  }
  if (actor.role === "CUSTOMER") {
    filters.push({ userId: actor.id });
  } else if (actor.role === "CASHIER") {
    filters.push({
      OR: [{ assignedCashierId: actor.id }, { createdById: actor.id }],
    });
    filters.push({ status: { in: [...cashierVisibleStatuses] } });
  } else if (actor.role === "BARISTA") {
    filters.push({ assignedBaristaId: actor.id });
    filters.push({ status: { in: [...baristaQueueStatuses] } });
  }
  const where: Prisma.OrderWhereInput = { AND: filters };
  const orderBy =
    actor.role === "BARISTA"
      ? [{ createdAt: "asc" as const }, { id: "asc" as const }]
      : [{ createdAt: "desc" as const }, { id: "desc" as const }];

  try {
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy,
        skip: (parsed.data.page - 1) * STAFF_PAGE_SIZE,
        take: STAFF_PAGE_SIZE,
        select:
          actor.role === "BARISTA"
            ? {
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
                    options: true,
                    note: true,
                  },
                },
              }
            : {
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
                items: {
                  select: {
                    id: true,
                    name: true,
                    quantity: true,
                    unitPrice: true,
                    options: true,
                    note: true,
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
                  },
                },
              },
      }),
      prisma.order.count({ where }),
    ]);
    return NextResponse.json({
      orders,
      page: parsed.data.page,
      pageSize: STAFF_PAGE_SIZE,
      total,
    });
  } catch (error) {
    console.error("Failed to fetch scoped orders:", error);
    return NextResponse.json({ error: "Không thể tải danh sách đơn hàng" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  let actor: Session["user"] | undefined;
  if (session?.user.id) {
    const allowedCreators: readonly AuthRole[] = [
      ...rolePermissions.counterOrders,
      "CUSTOMER",
    ];
    const access = await requireRole(allowedCreators, "api");
    if (access instanceof NextResponse) {
      return access;
    }
    actor = access;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu gửi lên không hợp lệ" },
      { status: 400 },
    );
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin đặt hàng không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const order = await createOrder(parsed.data, actor);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "Không thể tạo đơn hàng lúc này" },
      { status: 500 },
    );
  }
}
