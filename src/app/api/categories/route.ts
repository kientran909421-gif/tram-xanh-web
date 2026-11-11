import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { items: { some: { isAvailable: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Failed to fetch menu categories:", error);
    return NextResponse.json(
      { error: "Không thể tải danh mục" },
      { status: 500 },
    );
  }
}
