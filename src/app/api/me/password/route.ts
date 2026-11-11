import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { authRoles } from "@/lib/auth.config";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { changePasswordSchema } from "@/lib/validations/admin-user";

export async function PATCH(request: Request) {
  const actor = await requireRole(authRoles, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin mật khẩu không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    }

    if (!(await compare(parsed.data.currentPassword, user.passwordHash))) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng" },
        { status: 400 },
      );
    }
    if (await compare(parsed.data.newPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải khác mật khẩu hiện tại" },
        { status: 400 },
      );
    }

    const passwordHash = await hash(parsed.data.newPassword, 12);
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: actor.id },
        data: { passwordHash },
      });
      await writeAuditLog(transaction, actor, {
        action: "PASSWORD_CHANGED",
        entityType: "User",
        entityId: actor.id,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to change password:", error);
    return NextResponse.json(
      { error: "Không thể đổi mật khẩu lúc này" },
      { status: 500 },
    );
  }
}
