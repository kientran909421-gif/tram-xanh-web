import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  canTransitionOrder,
  rolePermissions,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { orderStaffActionSchema } from "@/lib/validations/order-management";

type RouteContext = { params: Promise<{ code: string }> };

type Result =
  | {
      kind:
        | "missing"
        | "forbidden"
        | "invalid-state"
        | "unpaid"
        | "insufficient-cash"
        | "invalid-cash"
        | "paid-cancel"
        | "not-found-staff";
    }
  | { kind: "updated"; order: { id: string; code: string; status: string } };

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireRole(rolePermissions.orderOperations, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = orderStaffActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thao tác đơn hàng không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { code } = await context.params;
  try {
    const result = await prisma.$transaction(
      async (transaction): Promise<Result> => {
        const order = await transaction.order.findFirst({
          where: { code: { equals: code, mode: "insensitive" } },
          select: {
            id: true,
            code: true,
            status: true,
            createdById: true,
            assignedCashierId: true,
            assignedBaristaId: true,
            payment: { select: { status: true } },
          },
        });
        if (!order) {
          return { kind: "missing" };
        }

        const isManager = actor.role === "ADMIN" || actor.role === "MANAGER";
        const isAssignedStaff =
          (actor.role === "CASHIER" &&
            (order.assignedCashierId === actor.id ||
              order.createdById === actor.id)) ||
          (actor.role === "BARISTA" &&
            order.assignedBaristaId === actor.id);
        if (!isManager && !isAssignedStaff) {
          return { kind: "forbidden" };
        }

        if (parsed.data.action === "ASSIGN") {
          if (
            !rolePermissions.orderAssignment.some(
              (role) => role === actor.role,
            )
          ) {
            return { kind: "forbidden" };
          }
          const nextCashierId = parsed.data.assignedCashierId;
          const nextBaristaId = parsed.data.assignedBaristaId;
          if (nextCashierId) {
            const cashier = await transaction.user.findFirst({
              where: {
                id: nextCashierId,
                role: "CASHIER",
                isActive: true,
              },
              select: { id: true },
            });
            if (!cashier) {
              return { kind: "not-found-staff" };
            }
          }
          if (nextBaristaId) {
            const barista = await transaction.user.findFirst({
              where: {
                id: nextBaristaId,
                role: "BARISTA",
                isActive: true,
              },
              select: { id: true },
            });
            if (!barista) {
              return { kind: "not-found-staff" };
            }
          }
          const updated = await transaction.order.update({
            where: { id: order.id },
            data: {
              ...(nextCashierId !== undefined
                ? { assignedCashierId: nextCashierId }
                : {}),
              ...(nextBaristaId !== undefined
                ? { assignedBaristaId: nextBaristaId }
                : {}),
            },
            select: { id: true, code: true, status: true },
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
          return { kind: "updated", order: updated };
        }

        if (parsed.data.action === "CONFIRM_PAYMENT") {
          if (
            !rolePermissions.paymentOperations.some(
              (role) => role === actor.role,
            )
          ) {
            return { kind: "forbidden" };
          }
          const payment = await transaction.payment.findUnique({
            where: { orderId: order.id },
            select: { id: true, status: true, method: true, amount: true },
          });
          if (!payment) {
            return { kind: "missing" };
          }
          if (payment.status !== "PENDING") {
            return { kind: "invalid-state" };
          }
          if (
            payment.method === "CASH" &&
            (parsed.data.amountTendered === undefined ||
              parsed.data.amountTendered < payment.amount)
          ) {
            return { kind: "insufficient-cash" };
          }
          if (
            payment.method !== "CASH" &&
            parsed.data.amountTendered !== undefined
          ) {
            return { kind: "invalid-cash" };
          }
          const changeDue =
            parsed.data.amountTendered === undefined
              ? null
              : parsed.data.amountTendered - payment.amount;
          await transaction.payment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              paidAt: new Date(),
              confirmedById: actor.id,
              amountTendered: parsed.data.amountTendered ?? null,
              changeDue,
            },
          });
          await writeAuditLog(transaction, actor, {
            action: "PAYMENT_CONFIRMED",
            entityType: "Payment",
            entityId: order.code,
            details: {
              method: payment.method,
              amountTendered: parsed.data.amountTendered ?? null,
              changeDue,
            },
          });
          return {
            kind: "updated",
            order: { id: order.id, code: order.code, status: order.status },
          };
        }

        if (parsed.data.action === "REFUND") {
          if (
            !rolePermissions.refund.some((role) => role === actor.role) ||
            !canTransitionOrder(actor.role, order.status, "REFUNDED")
          ) {
            return { kind: "forbidden" };
          }
          if (order.payment?.status !== "PAID") {
            return { kind: "unpaid" };
          }
          await transaction.payment.update({
            where: { orderId: order.id },
            data: { status: "REFUNDED" },
          });
          const updated = await transaction.order.update({
            where: { id: order.id },
            data: { status: "REFUNDED" },
            select: { id: true, code: true, status: true },
          });
          await writeAuditLog(transaction, actor, {
            action: "ORDER_REFUNDED",
            entityType: "Order",
            entityId: order.code,
            details: { paymentMethod: "manual" },
          });
          return { kind: "updated", order: updated };
        }

        const nextStatus =
          parsed.data.action === "STATUS" ? parsed.data.status : null;
        if (!nextStatus) {
          return { kind: "invalid-state" };
        }
        if (!canTransitionOrder(actor.role, order.status, nextStatus)) {
          return { kind: "forbidden" };
        }
        if (
          (nextStatus === "CONFIRMED" || nextStatus === "COMPLETED") &&
          order.payment?.status !== "PAID"
        ) {
          return { kind: "unpaid" };
        }
        if (nextStatus === "CANCELLED" && order.payment?.status === "PAID") {
          return { kind: "paid-cancel" };
        }

        const updated = await transaction.order.update({
          where: { id: order.id },
          data: { status: nextStatus },
          select: { id: true, code: true, status: true },
        });
        if (
          nextStatus === "CANCELLED" &&
          order.payment?.status === "PENDING"
        ) {
          await transaction.payment.update({
            where: { orderId: order.id },
            data: { status: "CANCELLED" },
          });
        }
        await writeAuditLog(transaction, actor, {
          action: "ORDER_STATUS_CHANGED",
          entityType: "Order",
          entityId: order.code,
          details: { from: order.status, to: nextStatus },
        });
        return { kind: "updated", order: updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    switch (result.kind) {
      case "missing":
        return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
      case "not-found-staff":
        return NextResponse.json({ error: "Không tìm thấy nhân viên đang hoạt động" }, { status: 404 });
      case "forbidden":
        return NextResponse.json({ error: "Không đủ quyền thực hiện thao tác này" }, { status: 403 });
      case "invalid-state":
        return NextResponse.json({ error: "Trạng thái hiện tại không cho phép thao tác này" }, { status: 409 });
      case "insufficient-cash":
        return NextResponse.json(
          { error: "Tiền khách đưa phải bằng hoặc lớn hơn tổng thanh toán" },
          { status: 400 },
        );
      case "invalid-cash":
        return NextResponse.json(
          { error: "Chỉ nhập tiền khách đưa khi thanh toán tiền mặt" },
          { status: 400 },
        );
      case "unpaid":
        return NextResponse.json({ error: "Cần xác nhận thanh toán trước thao tác này" }, { status: 409 });
      case "paid-cancel":
        return NextResponse.json(
          { error: "Đơn đã thanh toán; quản lý cần xử lý hoàn tiền" },
          { status: 409 },
        );
      case "updated":
        return NextResponse.json({ order: result.order });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Đơn hàng vừa được cập nhật. Vui lòng tải lại và thử lại." },
        { status: 409 },
      );
    }
    console.error("Failed to update order:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật đơn hàng" },
      { status: 500 },
    );
  }
}
