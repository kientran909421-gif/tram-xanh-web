import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { updatePromotionSchema } from "@/lib/validations/admin-promotion";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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
  const parsed = updatePromotionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin khuyến mãi không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.promotion.findUnique({
        where: { id },
      });
      if (!current) {
        return null;
      }
      const next = { ...current, ...parsed.data };
      if (next.expiresAt <= next.startsAt) {
        throw new RangeError("Ngày kết thúc phải sau ngày bắt đầu");
      }
      if (next.type === "PERCENT" && next.value > 100) {
        throw new RangeError("Phần trăm giảm không được vượt quá 100%");
      }
      const updated = await transaction.promotion.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description || null }
            : {}),
        },
      });
      await writeAuditLog(transaction, actor, {
        action: "PROMOTION_UPDATED",
        entityType: "Promotion",
        entityId: id,
        details: {
          code: current.code,
          changes: parsed.data,
        },
      });
      return updated;
    });
    if (!result) {
      return NextResponse.json({ error: "Không tìm thấy khuyến mãi" }, { status: 404 });
    }
    return NextResponse.json({ promotion: result });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Mã khuyến mãi đã tồn tại" }, { status: 409 });
    }
    console.error("Failed to update promotion:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật khuyến mãi" },
      { status: 500 },
    );
  }
}
