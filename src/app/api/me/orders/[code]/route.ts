import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { customerOrderActionSchema } from "@/lib/validations/order-management";
import { changeOrderStatus } from "@/services/order-status.service";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ code: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireRole(["CUSTOMER"], "api");
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = customerOrderActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thao tác đơn hàng không hợp lệ" }, { status: 400 });
  }

  const { code } = await context.params;
  try {
    const result = await prisma.$transaction(
      (transaction) =>
        changeOrderStatus(transaction, actor, code, "CANCELLED"),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    switch (result.kind) {
      case "not-found":
        return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
      case "forbidden":
        return NextResponse.json({ error: "Không đủ quyền hủy đơn hàng này" }, { status: 403 });
      case "invalid-transition":
        return NextResponse.json(
          { error: "Chỉ có thể hủy đơn hàng đang chờ xác nhận" },
          { status: 409 },
        );
      case "unpaid":
        return NextResponse.json({ error: "Đơn hàng chưa được thanh toán" }, { status: 409 });
      case "cancel-window-expired":
        return NextResponse.json({ error: "Đã quá thời gian cho phép hủy đơn" }, { status: 409 });
      case "updated":
        return NextResponse.json({ success: true, order: result.order });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Đơn hàng vừa được cập nhật. Vui lòng tải lại." }, { status: 409 });
    }
    console.error("Failed to cancel customer order:", error);
    return NextResponse.json({ error: "Không thể hủy đơn hàng lúc này" }, { status: 500 });
  }
}
