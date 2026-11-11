import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { updateAddressSchema } from "@/lib/validations/customer-profile";

type RouteContext = { params: Promise<{ id: string }> };

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
  const parsed = updateAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Địa chỉ không hợp lệ", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.userAddress.findFirst({
        where: { id, userId: actor.id },
        select: { id: true },
      });
      if (!current) return null;
      if (parsed.data.isDefault) {
        await transaction.userAddress.updateMany({
          where: { userId: actor.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      const updated = await transaction.userAddress.update({
        where: { id },
        data: parsed.data,
      });
      await writeAuditLog(transaction, actor, {
        action: "CUSTOMER_ADDRESS_UPDATED",
        entityType: "UserAddress",
        entityId: id,
      });
      return updated;
    });
    if (!result) {
      return NextResponse.json({ error: "Không tìm thấy địa chỉ" }, { status: 404 });
    }
    return NextResponse.json({ address: result });
  } catch (error) {
    console.error("Failed to update customer address:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật địa chỉ" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const actor = await requireRole(["CUSTOMER"], "api");
  if (actor instanceof NextResponse) {
    return actor;
  }
  const { id } = await context.params;
  try {
    const deleted = await prisma.$transaction(async (transaction) => {
      const result = await transaction.userAddress.deleteMany({
        where: { id, userId: actor.id },
      });
      if (result.count === 0) return false;
      await writeAuditLog(transaction, actor, {
        action: "CUSTOMER_ADDRESS_DELETED",
        entityType: "UserAddress",
        entityId: id,
      });
      return true;
    });
    if (!deleted) {
      return NextResponse.json({ error: "Không tìm thấy địa chỉ" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete customer address:", error);
    return NextResponse.json(
      { error: "Không thể xóa địa chỉ" },
      { status: 500 },
    );
  }
}
