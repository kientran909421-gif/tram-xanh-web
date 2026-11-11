import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { menuItemSelect } from "@/lib/menu";
import { menuQuerySchema } from "@/lib/validations/menu";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = menuQuerySchema.safeParse({
    category: url.searchParams.get("category") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    minPrice: url.searchParams.get("minPrice") ?? undefined,
    maxPrice: url.searchParams.get("maxPrice") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Tham số tìm kiếm không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { category, q, minPrice, maxPrice } = parsed.data;
  try {
    const items = await prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        ...(category ? { category: { slug: category } } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(minPrice !== undefined || maxPrice !== undefined
          ? {
              price: {
                ...(minPrice !== undefined ? { gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ name: "asc" }],
      select: menuItemSelect,
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to fetch menu items:", error);
    return NextResponse.json(
      { error: "Không thể tải thực đơn" },
      { status: 500 },
    );
  }
}
