import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import { updateMenuSchema } from "@/lib/validations/menu";
import { MenuInputError, uniqueMenuSlug } from "@/services/admin-menu";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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
  const parsed = updateMenuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin món không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const item = await prisma.$transaction(async (transaction) => {
      const current = await transaction.menuItem.findUnique({
        where: { id },
        select: { id: true, name: true, price: true },
      });
      if (!current) {
        throw new MenuInputError("Không tìm thấy món", 404);
      }
      const nextPrice = parsed.data.price ?? current.price;
      if (
        parsed.data.options?.some((option) => option.priceDelta < -nextPrice)
      ) {
        throw new MenuInputError(
          "Chênh lệch giá không được thấp hơn giá món",
          400,
        );
      }
      if (parsed.data.categoryId) {
        const category = await transaction.category.findUnique({
          where: { id: parsed.data.categoryId },
          select: { id: true },
        });
        if (!category) {
          throw new MenuInputError("Không tìm thấy danh mục", 400);
        }
      }

      const nextSlug =
        parsed.data.slug ??
        (parsed.data.name !== undefined
          ? await uniqueMenuSlug(
              transaction,
              parsed.data.name,
              current.id,
            )
          : undefined);
      const { options, ...fields } = parsed.data;
      const updateData = {
        ...fields,
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(fields.description !== undefined
          ? { description: fields.description || null }
          : {}),
        ...(fields.imageUrl !== undefined
          ? { imageUrl: fields.imageUrl || null }
          : {}),
      };

      await transaction.menuItem.update({
        where: { id },
        data: updateData,
      });

      if (options !== undefined) {
        const optionIds = options.flatMap((option) =>
          option.id ? [option.id] : [],
        );
        if (new Set(optionIds).size !== optionIds.length) {
          throw new MenuInputError("Tùy chọn món bị trùng", 400);
        }
        const ownedOptions = await transaction.menuItemOption.findMany({
          where: { menuItemId: id, id: { in: optionIds } },
          select: { id: true },
        });
        if (ownedOptions.length !== optionIds.length) {
          throw new MenuInputError("Tùy chọn không thuộc món này", 400);
        }
        await transaction.menuItemOption.deleteMany({
          where: {
            menuItemId: id,
            ...(optionIds.length > 0 ? { id: { notIn: optionIds } } : {}),
          },
        });
        for (const option of options) {
          const { id: optionId, ...optionData } = option;
          if (optionId) {
            await transaction.menuItemOption.update({
              where: { id: optionId },
              data: optionData,
            });
          } else {
            await transaction.menuItemOption.create({
              data: { ...optionData, menuItemId: id },
            });
          }
        }
      }

      return transaction.menuItem.findUniqueOrThrow({
        where: { id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          options: { orderBy: [{ group: "asc" }, { name: "asc" }] },
        },
      });
    });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof MenuInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isUniqueConflict(error)) {
      return NextResponse.json(
        { error: "Tên slug món đã tồn tại" },
        { status: 409 },
      );
    }
    console.error("Failed to update menu item:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật món" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireRole(adminPermissions.menu, "api");
  if (access instanceof NextResponse) {
    return access;
  }

  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const item = await transaction.menuItem.findUnique({
        where: { id },
        select: {
          id: true,
          _count: { select: { orderItems: true } },
        },
      });
      if (!item) {
        return "missing" as const;
      }
      if (item._count.orderItems > 0) {
        await transaction.menuItem.update({
          where: { id },
          data: { isAvailable: false },
        });
        return "unavailable" as const;
      }
      await transaction.menuItem.delete({ where: { id } });
      return "deleted" as const;
    });

    if (result === "missing") {
      return NextResponse.json({ error: "Không tìm thấy món" }, { status: 404 });
    }
    if (result === "unavailable") {
      return NextResponse.json({
        message: "Món đã có trong đơn hàng nên được chuyển sang trạng thái hết hàng",
        isAvailable: false,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Không tìm thấy món" }, { status: 404 });
      }
      if (error.code === "P2003") {
        try {
          await prisma.menuItem.update({
            where: { id: (await context.params).id },
            data: { isAvailable: false },
          });
          return NextResponse.json({
            message:
              "Món đã có trong đơn hàng nên được chuyển sang trạng thái hết hàng",
            isAvailable: false,
          });
        } catch (fallbackError) {
          console.error("Failed to deactivate referenced menu item:", fallbackError);
        }
      }
    }
    console.error("Failed to delete menu item:", error);
    return NextResponse.json({ error: "Không thể xóa món" }, { status: 500 });
  }
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
