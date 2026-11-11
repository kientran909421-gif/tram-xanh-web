import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { updateCustomerProfileSchema } from "@/lib/validations/customer-profile";

export async function GET() {
  const actor = await requireRole(["CUSTOMER"], "api");
  if (actor instanceof NextResponse) {
    return actor;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to fetch customer profile:", error);
    return NextResponse.json(
      { error: "Không thể tải thông tin cá nhân" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const actor = await requireRole(["CUSTOMER"], "api");
  if (actor instanceof NextResponse) {
    return actor;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = updateCustomerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin cá nhân không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  try {
    const user = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: actor.id },
        data: parsed.data,
        select: { id: true, name: true, email: true, phone: true },
      });
      await writeAuditLog(transaction, actor, {
        action: "CUSTOMER_PROFILE_UPDATED",
        entityType: "User",
        entityId: actor.id,
        details: { changes: parsed.data },
      });
      return updated;
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to update customer profile:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật thông tin cá nhân" },
      { status: 500 },
    );
  }
}
