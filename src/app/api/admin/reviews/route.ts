import { NextResponse } from "next/server";
import { z } from "zod";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
});
const PAGE_SIZE = 30;

export async function GET(request: Request) {
  const access = await requireRole(rolePermissions.reviewModeration, "api");
  if (access instanceof NextResponse) {
    return access;
  }
  const parsed = querySchema.safeParse({
    page: new URL(request.url).searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Trang đánh giá không hợp lệ" }, { status: 400 });
  }
  try {
    const where = {};
    const [reviews, total] = await prisma.$transaction([
      prisma.productReview.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          rating: true,
          comment: true,
          isVisible: true,
          createdAt: true,
          user: { select: { name: true } },
          menuItem: { select: { name: true } },
          orderItem: { select: { order: { select: { code: true } } } },
        },
      }),
      prisma.productReview.count({ where }),
    ]);
    return NextResponse.json({
      reviews,
      page: parsed.data.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    console.error("Failed to fetch product reviews:", error);
    return NextResponse.json({ error: "Không thể tải đánh giá" }, { status: 500 });
  }
}
