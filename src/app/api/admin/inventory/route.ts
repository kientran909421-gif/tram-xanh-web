import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  createIngredientSchema,
  ingredientQuerySchema,
} from "@/lib/validations/inventory";

export async function GET(request: Request) {
  const actor = await requireRole(rolePermissions.inventoryManagement, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }

  const params = new URL(request.url).searchParams;
  const parsed = ingredientQuerySchema.safeParse({
    q: params.get("q") ?? undefined,
    lowStock: params.get("lowStock") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bộ lọc tồn kho không hợp lệ" }, { status: 400 });
  }

  try {
    const ingredients = await prisma.inventoryIngredient.findMany({
      where: {
        isActive: true,
        ...(parsed.data.q
          ? { name: { contains: parsed.data.q, mode: "insensitive" } }
          : {}),
      },
      orderBy: { name: "asc" },
      include: {
        movements: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            quantity: true,
            note: true,
            createdAt: true,
            actor: { select: { name: true, role: true } },
          },
        },
      },
    });
    const filtered = ingredients.filter((ingredient) => {
      const lowStock = ingredient.quantityOnHand.lte(ingredient.lowStockAt);
      return parsed.data.lowStock === undefined || lowStock === parsed.data.lowStock;
    });
    return NextResponse.json({
      ingredients: filtered.map((ingredient) => ({
        ...ingredient,
        lowStock: ingredient.quantityOnHand.lte(ingredient.lowStockAt),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return NextResponse.json(
      { error: "Không thể tải tồn kho" },
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
  const parsed = createIngredientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin nguyên liệu không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const ingredient = await prisma.$transaction(async (transaction) => {
      const created = await transaction.inventoryIngredient.create({
        data: {
          name: parsed.data.name,
          unit: parsed.data.unit,
          lowStockAt: new Prisma.Decimal(parsed.data.lowStockAt),
          quantityOnHand: new Prisma.Decimal(parsed.data.initialQuantity),
        },
      });
      if (parsed.data.initialQuantity > 0) {
        await transaction.inventoryMovement.create({
          data: {
            ingredientId: created.id,
            actorId: actor.id,
            type: "RECEIPT",
            quantity: new Prisma.Decimal(parsed.data.initialQuantity),
            note: "Tồn kho ban đầu",
          },
        });
      }
      await writeAuditLog(transaction, actor, {
        action: "INVENTORY_INGREDIENT_CREATED",
        entityType: "InventoryIngredient",
        entityId: created.id,
        details: {
          name: created.name,
          unit: created.unit,
          initialQuantity: parsed.data.initialQuantity,
        },
      });
      return created;
    });
    return NextResponse.json({ ingredient }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Tên nguyên liệu đã tồn tại" },
        { status: 409 },
      );
    }
    console.error("Failed to create ingredient:", error);
    return NextResponse.json(
      { error: "Không thể tạo nguyên liệu" },
      { status: 500 },
    );
  }
}
