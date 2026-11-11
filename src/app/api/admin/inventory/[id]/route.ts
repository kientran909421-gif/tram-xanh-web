import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { updateIngredientSchema } from "@/lib/validations/inventory";

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
  const parsed = updateIngredientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin nguyên liệu không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const ingredient = await prisma.$transaction(async (transaction) => {
      const current = await transaction.inventoryIngredient.findUnique({
        where: { id },
        select: { id: true, name: true, unit: true, isActive: true },
      });
      if (!current) {
        return null;
      }
      const updated = await transaction.inventoryIngredient.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(parsed.data.lowStockAt !== undefined
            ? { lowStockAt: new Prisma.Decimal(parsed.data.lowStockAt) }
            : {}),
        },
      });
      await writeAuditLog(transaction, actor, {
        action: "INVENTORY_INGREDIENT_UPDATED",
        entityType: "InventoryIngredient",
        entityId: id,
        details: {
          previous: current,
          changes: parsed.data,
        },
      });
      return updated;
    });
    if (!ingredient) {
      return NextResponse.json({ error: "Không tìm thấy nguyên liệu" }, { status: 404 });
    }
    return NextResponse.json({ ingredient });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Tên nguyên liệu đã tồn tại" }, { status: 409 });
    }
    console.error("Failed to update ingredient:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật nguyên liệu" },
      { status: 500 },
    );
  }
}
