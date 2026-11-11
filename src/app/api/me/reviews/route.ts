import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { createReviewSchema } from "@/lib/validations/customer-profile";

export async function POST(request: Request) {
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
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Đánh giá không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const item = await transaction.orderItem.findUnique({
        where: { id: parsed.data.orderItemId },
        select: {
          id: true,
          menuItemId: true,
          order: { select: { userId: true, status: true } },
          reviews: { select: { id: true } },
        },
      });
      if (!item || item.order.userId !== actor.id) {
        return { kind: "missing" as const };
      }
      if (item.order.status !== "COMPLETED") {
        return { kind: "not-completed" as const };
      }
      if (item.reviews.length > 0) {
        return { kind: "already-reviewed" as const };
      }
      const review = await transaction.productReview.create({
        data: {
          userId: actor.id,
          menuItemId: item.menuItemId,
          orderItemId: item.id,
          rating: parsed.data.rating,
          comment: parsed.data.comment || null,
        },
        select: { id: true, rating: true, comment: true },
      });
      await writeAuditLog(transaction, actor, {
        action: "PRODUCT_REVIEW_CREATED",
        entityType: "ProductReview",
        entityId: review.id,
        details: { menuItemId: item.menuItemId, rating: review.rating },
      });
      return { kind: "created" as const, review };
    });

    switch (result.kind) {
      case "missing":
        return NextResponse.json(
          { error: "Không tìm thấy đơn hàng hoặc không có quyền đánh giá" },
          { status: 404 },
        );
      case "not-completed":
        return NextResponse.json(
          { error: "Chỉ đánh giá được món trong đơn đã hoàn thành" },
          { status: 409 },
        );
      case "already-reviewed":
        return NextResponse.json({ error: "Món này đã được đánh giá" }, { status: 409 });
      case "created":
        return NextResponse.json({ review: result.review }, { status: 201 });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Món này đã được đánh giá" }, { status: 409 });
    }
    console.error("Failed to create product review:", error);
    return NextResponse.json(
      { error: "Không thể gửi đánh giá" },
      { status: 500 },
    );
  }
}
