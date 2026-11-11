import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { cancellationReviewSchema } from "@/lib/validations/order-management";
import {
  changeOrderStatus,
  OrderWriteConflictError,
} from "@/services/order-status.service";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireRole(["ADMIN", "MANAGER"], "api");
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = cancellationReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Quyết định duyệt hủy không hợp lệ" }, { status: 400 });
  }

  const { requestId } = await context.params;
  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const cancellationRequest =
          await transaction.orderCancellationRequest.findUnique({
            where: { id: requestId },
            select: {
              id: true,
              status: true,
              order: { select: { id: true, code: true } },
            },
          });
        if (!cancellationRequest) return { kind: "not-found" as const };
        if (cancellationRequest.status !== "PENDING") {
          return { kind: "already-reviewed" as const };
        }

        if (parsed.data.decision === "APPROVE") {
          const transition = await changeOrderStatus(
            transaction,
            actor,
            cancellationRequest.order.id,
            "CANCELLED",
            parsed.data.note ?? "Duyệt yêu cầu hủy của khách hàng",
          );
          if (transition.kind !== "updated") {
            return { kind: "order-not-cancellable" as const };
          }
        }

        const status =
          parsed.data.decision === "APPROVE" ? "APPROVED" : "REJECTED";
        const reviewedAt = new Date();
        await transaction.orderCancellationRequest.update({
          where: { id: cancellationRequest.id },
          data: {
            status,
            reviewedById: actor.id,
            reviewNote: parsed.data.note || null,
            reviewedAt,
          },
        });
        await writeAuditLog(transaction, actor, {
          action:
            status === "APPROVED"
              ? "ORDER_CANCELLATION_APPROVED"
              : "ORDER_CANCELLATION_REJECTED",
          entityType: "Order",
          entityId: cancellationRequest.order.code,
          details: { requestId, note: parsed.data.note ?? null },
        });
        return { kind: "reviewed" as const, status };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    switch (result.kind) {
      case "not-found":
        return NextResponse.json({ error: "Không tìm thấy yêu cầu hủy" }, { status: 404 });
      case "already-reviewed":
        return NextResponse.json({ error: "Yêu cầu này đã được xử lý" }, { status: 409 });
      case "order-not-cancellable":
        return NextResponse.json({ error: "Đơn hàng không còn ở trạng thái có thể hủy" }, { status: 409 });
      case "reviewed":
        return NextResponse.json({ status: result.status });
    }
  } catch (error) {
    if (
      error instanceof OrderWriteConflictError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034")
    ) {
      return NextResponse.json({ error: "Yêu cầu vừa được cập nhật. Vui lòng tải lại." }, { status: 409 });
    }
    console.error("Failed to review cancellation request:", error);
    return NextResponse.json({ error: "Không thể xử lý yêu cầu hủy" }, { status: 500 });
  }
}
