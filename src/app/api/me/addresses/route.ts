import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { createAddressSchema } from "@/lib/validations/customer-profile";

export async function GET() {
  const actor = await requireRole(["CUSTOMER"], "api");
  if (actor instanceof NextResponse) {
    return actor;
  }
  try {
    const addresses = await prisma.userAddress.findMany({
      where: { userId: actor.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("Failed to fetch customer addresses:", error);
    return NextResponse.json(
      { error: "Không thể tải địa chỉ" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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
  const parsed = createAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Địa chỉ không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const address = await prisma.$transaction(async (transaction) => {
      const count = await transaction.userAddress.count({
        where: { userId: actor.id },
      });
      if (parsed.data.isDefault || count === 0) {
        await transaction.userAddress.updateMany({
          where: { userId: actor.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      const created = await transaction.userAddress.create({
        data: {
          ...parsed.data,
          isDefault: parsed.data.isDefault || count === 0,
          userId: actor.id,
        },
      });
      await writeAuditLog(transaction, actor, {
        action: "CUSTOMER_ADDRESS_CREATED",
        entityType: "UserAddress",
        entityId: created.id,
      });
      return created;
    });
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer address:", error);
    return NextResponse.json(
      { error: "Không thể lưu địa chỉ" },
      { status: 500 },
    );
  }
}
