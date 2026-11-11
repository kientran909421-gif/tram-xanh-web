import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { createInventoryAlertSchema } from "@/lib/validations/inventory";

export async function POST(request: Request) {
  const actor = await requireRole(["BARISTA"], "api");
  if (actor instanceof NextResponse) {
    return actor;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = createInventoryAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin báo thiếu nguyên liệu không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const alert = await prisma.$transaction(async (transaction) => {
      if (parsed.data.ingredientId) {
        const ingredient = await transaction.inventoryIngredient.findFirst({
          where: { id: parsed.data.ingredientId, isActive: true },
          select: { id: true },
        });
        if (!ingredient) {
          return null;
        }
      }
      const created = await transaction.inventoryAlert.create({
        data: {
          ingredientId: parsed.data.ingredientId,
          reportedById: actor.id,
          message: parsed.data.message,
        },
        include: {
          ingredient: { select: { id: true, name: true, unit: true } },
        },
      });
      await writeAuditLog(transaction, actor, {
        action: "INVENTORY_SHORTAGE_REPORTED",
        entityType: "InventoryAlert",
        entityId: created.id,
        details: {
          ingredientId: created.ingredientId,
          message: created.message,
        },
      });
      return created;
    });
    if (!alert) {
      return NextResponse.json({ error: "Không tìm thấy nguyên liệu" }, { status: 404 });
    }
    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("Failed to report inventory shortage:", error);
    return NextResponse.json(
      { error: "Không thể gửi cảnh báo nguyên liệu" },
      { status: 500 },
    );
  }
}
