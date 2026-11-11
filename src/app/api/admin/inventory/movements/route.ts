import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { inventoryMovementSchema } from "@/lib/validations/inventory";

export async function GET() {
  const access = await requireRole(rolePermissions.inventoryManagement, "api");
  if (access instanceof NextResponse) {
    return access;
  }
  try {
    const movements = await prisma.inventoryMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        quantity: true,
        note: true,
        createdAt: true,
        ingredient: { select: { id: true, name: true, unit: true } },
        actor: { select: { id: true, name: true, role: true } },
      },
    });
    return NextResponse.json({ movements });
  } catch (error) {
    console.error("Failed to fetch inventory movements:", error);
    return NextResponse.json(
      { error: "Không thể tải lịch sử kho" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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
  const parsed = inventoryMovementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin điều chỉnh kho không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const delta =
    parsed.data.type === "WASTE"
      ? -parsed.data.quantity
      : parsed.data.quantity;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const ingredient = await transaction.inventoryIngredient.findFirst({
        where: { id: parsed.data.ingredientId, isActive: true },
        select: { id: true, name: true, quantityOnHand: true, unit: true },
      });
      if (!ingredient) {
        return { kind: "missing" as const };
      }
      const updatedQuantity = ingredient.quantityOnHand.add(
        new Prisma.Decimal(delta),
      );
      if (updatedQuantity.lessThan(0)) {
        return { kind: "insufficient" as const };
      }
      await transaction.inventoryIngredient.update({
        where: { id: ingredient.id },
        data: { quantityOnHand: updatedQuantity },
      });
      const movement = await transaction.inventoryMovement.create({
        data: {
          ingredientId: ingredient.id,
          actorId: actor.id,
          type: parsed.data.type,
          quantity: new Prisma.Decimal(delta),
          note: parsed.data.note,
        },
      });
      await writeAuditLog(transaction, actor, {
        action: "INVENTORY_MOVEMENT_CREATED",
        entityType: "InventoryIngredient",
        entityId: ingredient.id,
        details: {
          type: parsed.data.type,
          quantity: delta,
          previousQuantity: ingredient.quantityOnHand.toString(),
          nextQuantity: updatedQuantity.toString(),
        },
      });
      return {
        kind: "updated" as const,
        movement,
        quantityOnHand: updatedQuantity,
        ingredient,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.kind === "missing") {
      return NextResponse.json({ error: "Không tìm thấy nguyên liệu" }, { status: 404 });
    }
    if (result.kind === "insufficient") {
      return NextResponse.json(
        { error: "Tồn kho không thể thấp hơn 0" },
        { status: 409 },
      );
    }
    return NextResponse.json({
      movement: result.movement,
      ingredient: {
        id: result.ingredient.id,
        name: result.ingredient.name,
        unit: result.ingredient.unit,
        quantityOnHand: result.quantityOnHand,
      },
    }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Tồn kho vừa được cập nhật. Vui lòng kiểm tra lại rồi thử lại." },
        { status: 409 },
      );
    }
    console.error("Failed to create inventory movement:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật tồn kho" },
      { status: 500 },
    );
  }
}
