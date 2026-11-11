import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { canManageRole, rolePermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { updateManagedUserSchema } from "@/lib/validations/admin-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireRole(rolePermissions.staffManagement, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }

  const parsed = updateManagedUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin tài khoản không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const target = await transaction.user.findUnique({
          where: { id },
          select: { id: true, email: true, role: true, isActive: true },
        });
        if (!target) {
          return { kind: "missing" as const };
        }
        if (!canManageRole(actor.role, target.role)) {
          return { kind: "forbidden" as const };
        }

        const nextRole = parsed.data.role ?? target.role;
        const nextIsActive = parsed.data.isActive ?? target.isActive;
        if (!canManageRole(actor.role, nextRole)) {
          return { kind: "forbidden" as const };
        }

        const losesAdminAccess =
          target.role === "ADMIN" &&
          (nextRole !== "ADMIN" || (target.isActive && !nextIsActive));
        if (losesAdminAccess) {
          if (target.id === actor.id) {
            return { kind: "last-admin" as const };
          }
          const activeAdmins = await transaction.user.count({
            where: { role: "ADMIN", isActive: true },
          });
          if (activeAdmins <= 1) {
            return { kind: "last-admin" as const };
          }
        }

        const updated = await transaction.user.update({
          where: { id },
          data: parsed.data,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        });
        await writeAuditLog(transaction, actor, {
          action: "USER_UPDATED",
          entityType: "User",
          entityId: id,
          details: {
            previous: {
              role: target.role,
              isActive: target.isActive,
              email: target.email,
            },
            changes: parsed.data,
            next: { role: updated.role, isActive: updated.isActive },
          },
        });
        return { kind: "updated" as const, user: updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.kind === "missing") {
      return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    }
    if (result.kind === "forbidden") {
      return NextResponse.json(
        { error: "Bạn không được quản lý tài khoản này hoặc vai trò này" },
        { status: 403 },
      );
    }
    if (result.kind === "last-admin") {
      return NextResponse.json(
        { error: "Không thể tự hạ quyền hoặc vô hiệu hóa quản trị viên cuối cùng" },
        { status: 409 },
      );
    }
    return NextResponse.json({ user: result.user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Email này đã được đăng ký" }, { status: 409 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Dữ liệu tài khoản vừa thay đổi. Vui lòng thử lại." },
        { status: 409 },
      );
    }
    console.error("Failed to update managed user:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật tài khoản" },
      { status: 500 },
    );
  }
}
