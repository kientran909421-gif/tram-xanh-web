import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { orderRefundSchema } from "@/lib/validations/order-management";
import {
  OrderWriteConflictError,
  refundOrderPayment,
} from "@/services/order-status.service";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const actor = await requireRole(["MANAGER", "ADMIN"], "api");
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = orderRefundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thông tin hoàn tiền không hợp lệ" }, { status: 400 });
  }

  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(
      (transaction) =>
        refundOrderPayment(
          transaction,
          actor,
          id,
          parsed.data.amount,
          parsed.data.note,
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
  } catch (error) {
    if (
      error instanceof OrderWriteConflictError ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
    ) {
      return NextResponse.json({ error: "Đơn hàng vừa được cập nhật. Vui lòng tải lại." }, { status: 409 });
    }
    console.error("Failed to refund order:", error);
    return NextResponse.json({ error: "Không thể hoàn tiền" }, { status: 500 });
  }
}
