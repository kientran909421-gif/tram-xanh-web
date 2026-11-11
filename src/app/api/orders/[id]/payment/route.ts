import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { orderPaymentSchema } from "@/lib/validations/order-management";
import {
  confirmOrderPayment,
  OrderWriteConflictError,
} from "@/services/order-status.service";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireRole(["CASHIER", "MANAGER", "ADMIN"], "api");
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = orderPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thông tin thanh toán không hợp lệ" }, { status: 400 });
  }

  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(
      (transaction) =>
        confirmOrderPayment(
          transaction,
          actor,
          id,
          parsed.data.amountTendered,
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
  } catch (error) {
    if (
      error instanceof OrderWriteConflictError ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
    ) {
      return NextResponse.json({ error: "Đơn hàng vừa được cập nhật. Vui lòng tải lại." }, { status: 409 });
    }
    console.error("Failed to confirm payment:", error);
    return NextResponse.json({ error: "Không thể cập nhật thanh toán" }, { status: 500 });
  }
}
