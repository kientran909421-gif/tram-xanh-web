import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const item = await prisma.menuItem.findFirst({
      where: { slug, isAvailable: true },
      select: {
        id: true,
        reviews: {
          where: { isVisible: true },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        },
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Không tìm thấy món" }, { status: 404 });
    }
    const aggregate = await prisma.productReview.aggregate({
      where: { menuItemId: item.id, isVisible: true },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return NextResponse.json({
      reviews: item.reviews,
      averageRating: aggregate._avg.rating,
      total: aggregate._count._all,
    });
  } catch (error) {
    console.error("Failed to fetch product reviews:", error);
    return NextResponse.json(
      { error: "Không thể tải đánh giá" },
      { status: 500 },
    );
  }
}
