import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import {
  slugifyCategoryName,
  updateCategorySchema,
} from "@/lib/validations/category";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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

  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin danh mục không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const updateData = {
      ...parsed.data,
      ...(parsed.data.name !== undefined && parsed.data.slug === undefined
        ? { slug: slugifyCategoryName(parsed.data.name) }
        : {}),
    };
    if (updateData.slug === "") {
      return NextResponse.json(
        { error: "Không thể tạo slug từ tên danh mục" },
        { status: 400 },
      );
    }
    const category = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.category.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, slug: true, sortOrder: true },
      });
      await writeAuditLog(transaction, access, {
        action: "CATEGORY_UPDATED",
        entityType: "Category",
        entityId: id,
        details: { changes: updateData },
      });
      return updated;
    });
    return NextResponse.json({ category });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return NextResponse.json(
        { error: "Tên hoặc slug danh mục đã tồn tại" },
        { status: 409 },
      );
    }
    if (isMissingRecord(error)) {
      return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 });
    }
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật danh mục" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireRole(adminPermissions.categories, "api");
  if (access instanceof NextResponse) {
    return access;
  }

  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          _count: { select: { items: true } },
        },
      });
      if (!category) {
        return "missing" as const;
      }
      if (category._count.items > 0) {
        return "has-items" as const;
      }
      await transaction.category.delete({ where: { id } });
      await writeAuditLog(transaction, access, {
        action: "CATEGORY_DELETED",
        entityType: "Category",
        entityId: id,
        details: { name: category.name },
      });
      return "deleted" as const;
    });

    if (result === "missing") {
      return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 });
    }
    if (result === "has-items") {
      return NextResponse.json(
        { error: "Danh mục còn món, hãy chuyển hoặc xóa món trước" },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isForeignKeyConflict(error)) {
      return NextResponse.json(
        { error: "Danh mục còn món, hãy chuyển hoặc xóa món trước" },
        { status: 409 },
      );
    }
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { error: "Không thể xóa danh mục" },
      { status: 500 },
    );
  }
}

function isUniqueConflict(error: unknown): boolean {
  return hasPrismaCode(error, "P2002");
}

function isMissingRecord(error: unknown): boolean {
  return hasPrismaCode(error, "P2025");
}

function isForeignKeyConflict(error: unknown): boolean {
  return hasPrismaCode(error, "P2003");
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
