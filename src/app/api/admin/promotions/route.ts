import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { createPromotionSchema } from "@/lib/validations/admin-promotion";

export async function GET() {
  const access = await requireRole(rolePermissions.promotionManagement, "api");
  if (access instanceof NextResponse) {
    return access;
  }
  try {
    const promotions = await prisma.promotion.findMany({
      orderBy: { startsAt: "desc" },
      take: 200,
      select: {
        id: true,
        code: true,
        description: true,
        type: true,
        value: true,
        minOrder: true,
        maxDiscount: true,
        startsAt: true,
        expiresAt: true,
        usageLimit: true,
        usedCount: true,
        isActive: true,
      },
    });
    return NextResponse.json({ promotions });
  } catch (error) {
    console.error("Failed to fetch promotions:", error);
    return NextResponse.json(
      { error: "Không thể tải mã khuyến mãi" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const actor = await requireRole(rolePermissions.promotionManagement, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = createPromotionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin khuyến mãi không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const promotion = await prisma.$transaction(async (transaction) => {
      const created = await transaction.promotion.create({
        data: {
          ...parsed.data,
          description: parsed.data.description || null,
        },
      });
      await writeAuditLog(transaction, actor, {
        action: "PROMOTION_CREATED",
        entityType: "Promotion",
        entityId: created.id,
        details: { code: created.code, type: created.type, value: created.value },
      });
      return created;
    });
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Mã khuyến mãi đã tồn tại" }, { status: 409 });
    }
    console.error("Failed to create promotion:", error);
    return NextResponse.json(
      { error: "Không thể tạo khuyến mãi" },
      { status: 500 },
    );
  }
}
