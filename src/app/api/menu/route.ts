import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { menuItemSelect } from "@/lib/menu";
import { menuQuerySchema } from "@/lib/validations/menu";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = menuQuerySchema.safeParse({
    category: url.searchParams.get("category") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    available: url.searchParams.get("available") ?? undefined,
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

  const { category, q, available } = parsed.data;
  try {
    const items = await prisma.menuItem.findMany({
      where: {
        ...(category ? { category: { slug: category } } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(available !== undefined
          ? { isAvailable: available === "true" }
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
