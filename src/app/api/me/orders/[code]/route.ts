import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { customerOrderActionSchema } from "@/lib/validations/order-management";

type RouteContext = { params: Promise<{ code: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireRole(["CUSTOMER"], "api");
  if (actor instanceof NextResponse) {
    return actor;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = customerOrderActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Thao tác đơn hàng không hợp lệ" },
      { status: 400 },
    );
  }

  const { code } = await context.params;
  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const order = await transaction.order.findFirst({
          where: {
            code: { equals: code, mode: "insensitive" },
            userId: actor.id,
          },
          select: {
            id: true,
            code: true,
            status: true,
            createdAt: true,
            payment: { select: { id: true, status: true } },
          },
        });
        if (!order) {
          return { kind: "missing" as const };
        }
        if (order.status !== "PENDING") {
          return { kind: "invalid-state" as const };
        }
        if (order.payment?.status === "PAID") {
          return { kind: "paid" as const };
        }

        const settings = await transaction.storeSettings.findUnique({
          where: { id: "store" },
          select: { customerCancelMinutes: true },
        });
        const cancelMinutes = settings?.customerCancelMinutes ?? 0;
        if (
          cancelMinutes > 0 &&
          Date.now() - order.createdAt.getTime() > cancelMinutes * 60_000
        ) {
          return { kind: "expired" as const };
        }

        await transaction.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });
        if (order.payment?.status === "PENDING") {
          await transaction.payment.update({
            where: { id: order.payment.id },
            data: { status: "CANCELLED" },
          });
        }
        await writeAuditLog(transaction, actor, {
          action: "ORDER_CANCELLED",
          entityType: "Order",
          entityId: order.code,
          details: { by: "customer", from: "PENDING", to: "CANCELLED" },
        });
        return { kind: "cancelled" as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    switch (result.kind) {
      case "missing":
        return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
      case "invalid-state":
        return NextResponse.json(
          { error: "Chỉ có thể hủy đơn hàng đang chờ xác nhận" },
          { status: 409 },
        );
      case "paid":
        return NextResponse.json(
          { error: "Đơn đã thanh toán; vui lòng liên hệ cửa hàng để được hỗ trợ" },
          { status: 409 },
        );
      case "expired":
        return NextResponse.json(
          { error: "Đã quá thời gian cho phép hủy đơn" },
          { status: 409 },
        );
      case "cancelled":
        return NextResponse.json({ success: true, status: "CANCELLED" });
    }
  } catch (error) {
    console.error("Failed to cancel customer order:", error);
    return NextResponse.json(
      { error: "Không thể hủy đơn hàng lúc này" },
      { status: 500 },
    );
  }
}
