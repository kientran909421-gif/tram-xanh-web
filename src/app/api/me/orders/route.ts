import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { myOrdersQuerySchema } from "@/lib/validations/order";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
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
      prisma.order.count({ where: { userId: session.user.id } }),
      prisma.order.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          code: true,
          status: true,
          type: true,
          subtotal: true,
          discount: true,
          deliveryFee: true,
          total: true,
          createdAt: true,
          items: {
            select: {
              name: true,
              quantity: true,
              options: true,
            },
          },
          payment: {
            select: {
              method: true,
              status: true,
            },
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
