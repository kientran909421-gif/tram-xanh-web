import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };
const updateSchema = z.object({ isVisible: z.boolean() }).strict();

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireRole(rolePermissions.reviewModeration, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Trạng thái đánh giá không hợp lệ" }, { status: 400 });
  }
  const { id } = await context.params;
  try {
    const review = await prisma.$transaction(async (transaction) => {
      const current = await transaction.productReview.findUnique({
        where: { id },
        select: { id: true, isVisible: true },
      });
      if (!current) return null;
      const updated = await transaction.productReview.update({
        where: { id },
        data: parsed.data,
      });
      await writeAuditLog(transaction, actor, {
        action: "PRODUCT_REVIEW_MODERATED",
        entityType: "ProductReview",
        entityId: id,
        details: { from: current.isVisible, to: updated.isVisible },
      });
      return updated;
    });
    if (!review) {
      return NextResponse.json({ error: "Không tìm thấy đánh giá" }, { status: 404 });
    }
    return NextResponse.json({ review });
  } catch (error) {
    console.error("Failed to moderate product review:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật đánh giá" },
      { status: 500 },
    );
  }
}
