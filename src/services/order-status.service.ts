import { Prisma, type OrderStatus } from "@prisma/client";
import type { AuthRole } from "../lib/auth.config";
import type { AuditActor } from "../lib/audit-log";
import { canTransitionOrder } from "../lib/permissions";
import { writeAuditLog } from "../lib/audit-log";

export type OrderStatusActor = AuditActor & { role: AuthRole };
type StatusActor = OrderStatusActor;

export class OrderWriteConflictError extends Error {
  constructor() {
    super("Order changed during the operation");
    this.name = "OrderWriteConflictError";
  }
}

export type OrderStatusResult =
  | {
      kind:
        | "not-found"
        | "forbidden"
        | "invalid-transition"
        | "unpaid"
        | "cancel-window-expired";
    }
  | {
      kind: "updated";
      order: { id: string; code: string; status: OrderStatus; statusUpdatedAt: Date };
    };

export function canOperateOrder(
  actor: Pick<OrderStatusActor, "id" | "role">,
  order: {
    userId: string | null;
    createdById: string | null;
    assignedCashierId: string | null;
    assignedBaristaId: string | null;
  },
) {
  if (actor.role === "ADMIN" || actor.role === "MANAGER") {
    return true;
  }
  if (actor.role === "CUSTOMER") {
    return order.userId === actor.id;
  }
  if (actor.role === "CASHIER") {
    return order.assignedCashierId === actor.id || order.createdById === actor.id;
  }
  return actor.role === "BARISTA" && order.assignedBaristaId === actor.id;
}

export async function changeOrderStatus(
  transaction: Prisma.TransactionClient,
  actor: StatusActor,
  identifier: string,
  nextStatus: OrderStatus,
  note?: string,
): Promise<OrderStatusResult> {
  const order = await transaction.order.findFirst({
    where: {
      OR: [
        { id: identifier },
        { code: { equals: identifier, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      code: true,
      status: true,
      paymentStatus: true,
      type: true,
      userId: true,
      createdById: true,
      assignedCashierId: true,
      assignedBaristaId: true,
      createdAt: true,
    },
  });
  if (!order) {
    return { kind: "not-found" };
  }
  if (actor.role === "CUSTOMER" && order.userId !== actor.id) {
    return { kind: "not-found" };
  }

  if (!canOperateOrder(actor, order)) {
    return { kind: "forbidden" };
  }

  if (
    !canTransitionOrder(actor.role, order.status, nextStatus, order.type) ||
    nextStatus === "REFUNDED"
  ) {
    return { kind: "invalid-transition" };
  }

  if (
    nextStatus === "COMPLETED" &&
    order.paymentStatus !== "PAID" &&
    order.paymentStatus !== "PARTIALLY_REFUNDED"
  ) {
    return { kind: "unpaid" };
  }

  if (actor.role === "CUSTOMER" && nextStatus === "CANCELLED") {
    const settings = await transaction.storeSettings.findUnique({
      where: { id: "store" },
      select: { customerCancelMinutes: true },
    });
    const cancelMinutes = settings?.customerCancelMinutes ?? 0;
    if (
      cancelMinutes > 0 &&
      Date.now() - order.createdAt.getTime() > cancelMinutes * 60_000
    ) {
      return { kind: "cancel-window-expired" };
    }
  }

  const statusUpdatedAt = new Date();
  const update = await transaction.order.updateMany({
    where: {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
    },
    data: { status: nextStatus, statusUpdatedAt },
  });
  if (update.count !== 1) {
    return { kind: "invalid-transition" };
  }

  await transaction.orderStatusHistory.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: nextStatus,
      changedById: actor.id,
      changedByRole: actor.role,
      note: note?.trim() || null,
      createdAt: statusUpdatedAt,
    },
  });
  await writeAuditLog(transaction, actor, {
    action: nextStatus === "CANCELLED" ? "ORDER_CANCELLED" : "ORDER_STATUS_CHANGED",
    entityType: "Order",
    entityId: order.code,
    details: {
      from: order.status,
      to: nextStatus,
      ...(note?.trim() ? { note: note.trim() } : {}),
    },
  });

  return {
    kind: "updated",
    order: {
      id: order.id,
      code: order.code,
      status: nextStatus,
      statusUpdatedAt,
    },
  };
}

export type PaymentActionResult =
  | {
      kind:
        | "not-found"
        | "forbidden"
        | "invalid-state"
        | "invalid-cash"
        | "insufficient-cash";
    }
  | {
      kind: "updated";
      paymentStatus: "PAID";
      amountTendered: number | null;
      changeDue: number | null;
    };

export async function confirmOrderPayment(
  transaction: Prisma.TransactionClient,
  actor: StatusActor,
  identifier: string,
  amountTendered?: number,
): Promise<PaymentActionResult> {
  if (!["ADMIN", "MANAGER", "CASHIER"].includes(actor.role)) {
    return { kind: "forbidden" };
  }
  const order = await transaction.order.findFirst({
    where: {
      OR: [
        { id: identifier },
        { code: { equals: identifier, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      code: true,
      status: true,
      paymentStatus: true,
      userId: true,
      createdById: true,
      assignedCashierId: true,
      assignedBaristaId: true,
      payment: {
        select: { id: true, method: true, status: true, amount: true },
      },
    },
  });
  if (!order || !order.payment) {
    return { kind: "not-found" };
  }
  if (!canOperateOrder(actor, order)) {
    return { kind: "forbidden" };
  }
  if (
    !["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status) ||
    (order.payment.status !== "UNPAID" && order.payment.status !== "FAILED") ||
    order.paymentStatus !== "UNPAID" && order.paymentStatus !== "FAILED"
  ) {
    return { kind: "invalid-state" };
  }
  if (order.payment.method === "CASH") {
    if (amountTendered === undefined || amountTendered < order.payment.amount) {
      return { kind: "insufficient-cash" };
    }
  } else if (amountTendered !== undefined) {
    return { kind: "invalid-cash" };
  }

  const changeDue =
    amountTendered === undefined ? null : amountTendered - order.payment.amount;
  const paymentUpdate = await transaction.payment.updateMany({
    where: {
      id: order.payment.id,
      status: order.payment.status,
    },
    data: {
      status: "PAID",
      paidAt: new Date(),
      confirmedById: actor.id,
      amountTendered: amountTendered ?? null,
      changeDue,
    },
  });
  if (paymentUpdate.count !== 1) {
    return { kind: "invalid-state" };
  }
  const orderUpdate = await transaction.order.updateMany({
    where: {
      id: order.id,
      paymentStatus: order.paymentStatus,
      status: order.status,
    },
    data: { paymentStatus: "PAID" },
  });
  if (orderUpdate.count !== 1) {
    throw new OrderWriteConflictError();
  }
  await writeAuditLog(transaction, actor, {
    action: "PAYMENT_CONFIRMED",
    entityType: "Payment",
    entityId: order.code,
    details: {
      method: order.payment.method,
      amountTendered: amountTendered ?? null,
      changeDue,
    },
  });

  return {
    kind: "updated",
    paymentStatus: "PAID",
    amountTendered: amountTendered ?? null,
    changeDue,
  };
}

export type RefundResult =
  | {
      kind: "not-found" | "forbidden" | "invalid-state" | "invalid-amount";
    }
  | {
      kind: "updated";
      paymentStatus: "PARTIALLY_REFUNDED" | "REFUNDED";
      refundedAmount: number;
      orderStatus: OrderStatus;
    };

export async function refundOrderPayment(
  transaction: Prisma.TransactionClient,
  actor: StatusActor,
  identifier: string,
  requestedAmount?: number,
  note?: string,
): Promise<RefundResult> {
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") {
    return { kind: "forbidden" };
  }
  const order = await transaction.order.findFirst({
    where: {
      OR: [
        { id: identifier },
        { code: { equals: identifier, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      code: true,
      status: true,
      paymentStatus: true,
      payment: {
        select: {
          id: true,
          status: true,
          amount: true,
          refundedAmount: true,
        },
      },
    },
  });
  if (!order || !order.payment) {
    return { kind: "not-found" };
  }
  if (
    (order.payment.status !== "PAID" &&
      order.payment.status !== "PARTIALLY_REFUNDED") ||
    (order.paymentStatus !== "PAID" &&
      order.paymentStatus !== "PARTIALLY_REFUNDED")
  ) {
    return { kind: "invalid-state" };
  }

  const remaining = order.payment.amount - order.payment.refundedAmount;
  const refundAmount = requestedAmount ?? remaining;
  if (!Number.isSafeInteger(refundAmount) || refundAmount <= 0 || refundAmount > remaining) {
    return { kind: "invalid-amount" };
  }
  const refundedAmount = order.payment.refundedAmount + refundAmount;
  const paymentStatus =
    refundedAmount === order.payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
  const now = new Date();
  const paymentUpdate = await transaction.payment.updateMany({
    where: {
      id: order.payment.id,
      status: order.payment.status,
      refundedAmount: order.payment.refundedAmount,
    },
    data: {
      refundedAmount: { increment: refundAmount },
      status: paymentStatus,
    },
  });
  if (paymentUpdate.count !== 1) {
    return { kind: "invalid-state" };
  }

  const nextOrderStatus =
    paymentStatus === "REFUNDED" ? "REFUNDED" : order.status;
  const orderUpdate = await transaction.order.updateMany({
    where: {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
    },
    data: {
      paymentStatus,
      ...(nextOrderStatus !== order.status
        ? { status: nextOrderStatus, statusUpdatedAt: now }
        : {}),
    },
  });
  if (orderUpdate.count !== 1) {
    throw new OrderWriteConflictError();
  }

  if (nextOrderStatus !== order.status) {
    await transaction.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: nextOrderStatus,
        changedById: actor.id,
        changedByRole: actor.role,
        note: note?.trim() || "Hoàn tiền đầy đủ",
        createdAt: now,
      },
    });
  }
  await writeAuditLog(transaction, actor, {
    action:
      paymentStatus === "REFUNDED"
        ? "ORDER_REFUNDED"
        : "ORDER_PARTIALLY_REFUNDED",
    entityType: "Order",
    entityId: order.code,
    details: {
      amount: refundAmount,
      refundedAmount,
      paymentStatus,
      ...(note?.trim() ? { note: note.trim() } : {}),
    },
  });
  return {
    kind: "updated",
    paymentStatus,
    refundedAmount,
    orderStatus: nextOrderStatus,
  };
}
