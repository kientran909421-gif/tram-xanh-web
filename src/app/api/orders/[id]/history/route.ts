import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const actor = await requireRole(["ADMIN", "MANAGER"], "api");
  if (actor instanceof NextResponse) return actor;

  const { id } = await context.params;
  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { code: { equals: id, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: order.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        fromStatus: true,
        toStatus: true,
        changedById: true,
        changedByRole: true,
        note: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Failed to load order status history:", error);
    return NextResponse.json({ error: "Không thể tải lịch sử đơn hàng" }, { status: 500 });
  }
}
