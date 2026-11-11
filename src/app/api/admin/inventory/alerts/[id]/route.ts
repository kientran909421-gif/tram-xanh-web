import { NextResponse } from "next/server";
import { rolePermissions } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { updateInventoryAlertSchema } from "@/lib/validations/inventory";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireRole(rolePermissions.inventoryManagement, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = updateInventoryAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Trạng thái cảnh báo không hợp lệ" }, { status: 400 });
  }

  const { id } = await context.params;
  try {
    const alert = await prisma.$transaction(async (transaction) => {
      const current = await transaction.inventoryAlert.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!current) {
        return null;
      }
      const updated = await transaction.inventoryAlert.update({
        where: { id },
        data: {
          status: parsed.data.status,
          resolvedById: actor.id,
          resolvedAt: new Date(),
        },
      });
      await writeAuditLog(transaction, actor, {
        action: "INVENTORY_ALERT_UPDATED",
        entityType: "InventoryAlert",
        entityId: id,
        details: { from: current.status, to: updated.status },
      });
      return updated;
    });
    if (!alert) {
      return NextResponse.json({ error: "Không tìm thấy cảnh báo" }, { status: 404 });
    }
    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Failed to update inventory alert:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật cảnh báo" },
      { status: 500 },
    );
  }
}
