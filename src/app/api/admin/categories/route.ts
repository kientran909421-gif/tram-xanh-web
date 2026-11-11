import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import { createCategorySchema } from "@/lib/validations/category";

export async function GET() {
  const access = await requireRole(adminPermissions.categories, "api");
  if (access instanceof NextResponse) {
    return access;
  }

  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
        _count: { select: { items: true } },
      },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Failed to fetch admin categories:", error);
    return NextResponse.json(
      { error: "Không thể tải danh mục" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const access = await requireRole(adminPermissions.categories, "api");
  if (access instanceof NextResponse) {
    return access;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu gửi lên không hợp lệ" },
      { status: 400 },
    );
  }

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin danh mục không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const category = await prisma.category.create({
      data: parsed.data,
      select: { id: true, name: true, slug: true, sortOrder: true },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return NextResponse.json(
        { error: "Tên hoặc slug danh mục đã tồn tại" },
        { status: 409 },
      );
    }
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Không thể tạo danh mục" },
      { status: 500 },
    );
  }
}

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
