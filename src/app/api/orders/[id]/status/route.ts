import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { rolePermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import { orderStatusChangeSchema } from "@/lib/validations/order-management";
import { changeOrderStatus } from "@/services/order-status.service";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireRole(rolePermissions.orderOperations, "api");
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = orderStatusChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Trạng thái đơn hàng không hợp lệ", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(
      (transaction) =>
        changeOrderStatus(
          transaction,
          actor,
          id,
          parsed.data.status,
          parsed.data.note,
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Đơn hàng vừa được cập nhật. Vui lòng tải lại." }, { status: 409 });
    }
    console.error("Failed to change order status:", error);
    return NextResponse.json({ error: "Không thể cập nhật trạng thái đơn hàng" }, { status: 500 });
  }
}
