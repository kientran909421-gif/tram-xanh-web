import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const actor = await requireRole(["ADMIN", "MANAGER"], "api");
  if (actor instanceof NextResponse) return actor;

  try {
    const requests = await prisma.orderCancellationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        reason: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            code: true,
            status: true,
            type: true,
            customerName: true,
            customerPhone: true,
            total: true,
            address: true,
          },
        },
      },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Failed to fetch cancellation requests:", error);
    return NextResponse.json({ error: "Không thể tải yêu cầu hủy đơn" }, { status: 500 });
  }
}
