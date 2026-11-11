import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { cancellationRequestSchema } from "@/lib/validations/order-management";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const actor = await requireRole(["CUSTOMER"], "api");
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = cancellationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Lý do hủy đơn không hợp lệ" }, { status: 400 });
  }

  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const order = await transaction.order.findFirst({
          where: {
            userId: actor.id,
            OR: [
              { id },
              { code: { equals: id, mode: "insensitive" } },
            ],
          },
          select: { id: true, code: true, status: true },
        });
        if (!order) return { kind: "not-found" as const };
        if (order.status !== "CONFIRMED") {
          return { kind: "invalid-state" as const };
        }
        const pending = await transaction.orderCancellationRequest.findFirst({
          where: { orderId: order.id, status: "PENDING" },
          select: { id: true },
        });
        if (pending) return { kind: "already-requested" as const };

        const cancellationRequest =
          await transaction.orderCancellationRequest.create({
            data: {
              orderId: order.id,
              requestedById: actor.id,
              reason: parsed.data.reason || null,
            },
            select: { id: true, status: true, createdAt: true },
          });
        await writeAuditLog(transaction, actor, {
          action: "ORDER_CANCELLATION_REQUESTED",
          entityType: "Order",
          entityId: order.code,
          details: { reason: parsed.data.reason ?? null },
        });
        return { kind: "created" as const, cancellationRequest };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    switch (result.kind) {
      case "not-found":
        return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
      case "invalid-state":
        return NextResponse.json({ error: "Chỉ có thể gửi yêu cầu hủy khi đơn đã xác nhận" }, { status: 409 });
      case "already-requested":
        return NextResponse.json({ error: "Đơn hàng đã có yêu cầu hủy đang chờ duyệt" }, { status: 409 });
      case "created":
        return NextResponse.json({ cancellationRequest: result.cancellationRequest }, { status: 201 });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Yêu cầu vừa được gửi. Vui lòng tải lại." }, { status: 409 });
    }
    console.error("Failed to request order cancellation:", error);
    return NextResponse.json({ error: "Không thể gửi yêu cầu hủy đơn" }, { status: 500 });
  }
}
