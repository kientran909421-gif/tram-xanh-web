import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import {
  adminMenuQuerySchema,
  createMenuSchema,
} from "@/lib/validations/menu";
import { MenuInputError, uniqueMenuSlug } from "@/services/admin-menu";

const PAGE_SIZE = 10;

export async function GET(request: Request) {
  const access = await requireRole(adminPermissions.menu, "api");
  if (access instanceof NextResponse) {
    return access;
  }

  const params = new URL(request.url).searchParams;
  const parsed = adminMenuQuerySchema.safeParse({
    page: params.get("page") ?? undefined,
    q: params.get("q") ?? undefined,
    category: params.get("category") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bộ lọc danh sách món không hợp lệ" },
      { status: 400 },
    );
  }

  const { page, q, category } = parsed.data;
  const where: Prisma.MenuItemWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(category ? { category: { slug: category } } : {}),
  };

  try {
    const [items, total] = await prisma.$transaction([
      prisma.menuItem.findMany({
        where,
        orderBy: [{ name: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          options: {
            orderBy: [{ group: "asc" }, { name: "asc" }],
          },
        },
      }),
      prisma.menuItem.count({ where }),
    ]);

    return NextResponse.json({
      items,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    console.error("Failed to fetch admin menu:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách món" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const access = await requireRole(adminPermissions.menu, "api");
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

  const parsed = createMenuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin món không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findUnique({
        where: { id: parsed.data.categoryId },
        select: { id: true },
      });
      if (!category) {
        throw new MenuInputError("Không tìm thấy danh mục", 400);
      }

      const slug = await uniqueMenuSlug(
        transaction,
        parsed.data.slug ?? parsed.data.name,
      );
      return transaction.menuItem.create({
        data: {
          ...parsed.data,
          slug,
          description: parsed.data.description || null,
          imageUrl: parsed.data.imageUrl || null,
          options: {
            create: parsed.data.options.map(({ id: _id, ...option }) => option),
          },
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          options: true,
        },
      });
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    if (error instanceof MenuInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isUniqueConflict(error)) {
      return NextResponse.json(
        { error: "Không thể tạo slug duy nhất cho món" },
        { status: 409 },
      );
    }
    console.error("Failed to create menu item:", error);
    return NextResponse.json({ error: "Không thể tạo món" }, { status: 500 });
  }
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
