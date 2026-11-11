import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rolePermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { orderStaffActionSchema } from "@/lib/validations/order-management";
import {
  changeOrderStatus,
  confirmOrderPayment,
  OrderWriteConflictError,
  refundOrderPayment,
} from "@/services/order-status.service";

type RouteContext = { params: Promise<{ code: string }> };

function transactionConflict(error: unknown) {
  return (
    error instanceof OrderWriteConflictError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034")
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireRole(rolePermissions.orderOperations, "api");
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = orderStaffActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Thao tác đơn hàng không hợp lệ", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { code } = await context.params;
  const action = parsed.data;

  try {
    if (action.action === "STATUS") {
      const result = await prisma.$transaction(
        (transaction) =>
          changeOrderStatus(
            transaction,
            actor,
            code,
            action.status,
            action.note,
          ),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      switch (result.kind) {
        case "not-found":
          return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
        case "forbidden":
          return NextResponse.json({ error: "Không đủ quyền thực hiện thao tác này" }, { status: 403 });
        case "invalid-transition":
          return NextResponse.json({ error: "Không thể chuyển sang trạng thái này" }, { status: 400 });
        case "unpaid":
          return NextResponse.json({ error: "Cần xác nhận thanh toán trước khi hoàn tất đơn" }, { status: 409 });
        case "cancel-window-expired":
          return NextResponse.json({ error: "Đã quá thời gian cho phép hủy đơn" }, { status: 409 });
        case "updated":
          return NextResponse.json({ order: result.order });
      }
    }

    if (action.action === "CONFIRM_PAYMENT") {
      const result = await prisma.$transaction(
        (transaction) =>
          confirmOrderPayment(
            transaction,
            actor,
            code,
            action.amountTendered,
          ),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      switch (result.kind) {
        case "not-found":
          return NextResponse.json({ error: "Không tìm thấy đơn hàng hoặc thanh toán" }, { status: 404 });
        case "forbidden":
          return NextResponse.json({ error: "Không đủ quyền thanh toán đơn này" }, { status: 403 });
        case "invalid-state":
          return NextResponse.json({ error: "Trạng thái đơn hoặc thanh toán không cho phép thao tác này" }, { status: 409 });
        case "invalid-cash":
          return NextResponse.json({ error: "Chỉ nhập tiền khách đưa khi thanh toán tiền mặt" }, { status: 400 });
        case "insufficient-cash":
          return NextResponse.json({ error: "Tiền khách đưa phải bằng hoặc lớn hơn tổng thanh toán" }, { status: 400 });
        case "updated":
          return NextResponse.json({ payment: result });
      }
    }

    if (action.action === "REFUND") {
      const result = await prisma.$transaction(
        (transaction) =>
          refundOrderPayment(
            transaction,
            actor,
            code,
            action.amount,
            action.note,
          ),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      switch (result.kind) {
        case "not-found":
          return NextResponse.json({ error: "Không tìm thấy đơn hàng hoặc thanh toán" }, { status: 404 });
        case "forbidden":
          return NextResponse.json({ error: "Chỉ quản lý hoặc quản trị viên được hoàn tiền" }, { status: 403 });
        case "invalid-state":
          return NextResponse.json({ error: "Chỉ thanh toán đã nhận mới được hoàn tiền" }, { status: 409 });
        case "invalid-amount":
          return NextResponse.json({ error: "Số tiền hoàn vượt quá số tiền còn lại hoặc không hợp lệ" }, { status: 400 });
        case "updated":
          return NextResponse.json({ refund: result });
      }
    }

    const assignment = action;
    if (
      !rolePermissions.orderAssignment.some(
        (allowedRole) => allowedRole === actor.role,
      )
    ) {
      return NextResponse.json({ error: "Không đủ quyền phân công đơn hàng" }, { status: 403 });
    }

    const result = await prisma.$transaction(
      async (transaction) => {
        const order = await transaction.order.findFirst({
          where: { code: { equals: code, mode: "insensitive" } },
          select: { id: true, code: true },
        });
        if (!order) return { kind: "missing" as const };

        const nextCashierId = assignment.assignedCashierId;
        const nextBaristaId = assignment.assignedBaristaId;
        if (nextCashierId) {
          const cashier = await transaction.user.findFirst({
            where: { id: nextCashierId, role: "CASHIER", isActive: true },
            select: { id: true },
          });
          if (!cashier) return { kind: "not-found-staff" as const };
        }
        if (nextBaristaId) {
          const barista = await transaction.user.findFirst({
            where: { id: nextBaristaId, role: "BARISTA", isActive: true },
            select: { id: true },
          });
          if (!barista) return { kind: "not-found-staff" as const };
        }
        await transaction.order.update({
          where: { id: order.id },
          data: {
            ...(nextCashierId !== undefined
              ? { assignedCashierId: nextCashierId }
              : {}),
            ...(nextBaristaId !== undefined
              ? { assignedBaristaId: nextBaristaId }
              : {}),
          },
        });
        await writeAuditLog(transaction, actor, {
          action: "ORDER_ASSIGNED",
          entityType: "Order",
          entityId: order.code,
          details: {
            assignedCashierId: nextCashierId,
            assignedBaristaId: nextBaristaId,
          },
        });
        return { kind: "updated" as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (result.kind === "missing") {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }
    if (result.kind === "not-found-staff") {
      return NextResponse.json({ error: "Không tìm thấy nhân viên đang hoạt động" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (transactionConflict(error)) {
      return NextResponse.json({ error: "Đơn hàng vừa được cập nhật. Vui lòng tải lại và thử lại." }, { status: 409 });
    }
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Không thể cập nhật đơn hàng" }, { status: 500 });
  }
}
