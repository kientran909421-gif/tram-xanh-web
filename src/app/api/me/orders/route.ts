import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { myOrdersQuerySchema } from "@/lib/validations/order";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const actor = await requireRole(["CUSTOMER"], "api");
  if (actor instanceof NextResponse) {
    return actor;
  }

  const url = new URL(request.url);
  const parsed = myOrdersQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Số trang không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const page = parsed.data.page;
  try {
    const [total, orders] = await prisma.$transaction([
      prisma.order.count({ where: { userId: actor.id } }),
      prisma.order.findMany({
        where: { userId: actor.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          code: true,
          status: true,
          paymentStatus: true,
          type: true,
          subtotal: true,
          discount: true,
          deliveryFee: true,
          total: true,
          createdAt: true,
          statusUpdatedAt: true,
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              options: true,
              reviews: { select: { id: true } },
            },
          },
          payment: {
            select: {
              method: true,
              status: true,
            },
          },
          cancellationRequests: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      items: orders,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    console.error("Failed to fetch customer orders:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách đơn hàng" },
      { status: 500 },
    );
  }
}
