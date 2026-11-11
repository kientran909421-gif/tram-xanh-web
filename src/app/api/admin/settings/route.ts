import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { updateStoreSettingsSchema } from "@/lib/validations/store-settings";

async function getStoreSettings() {
  const settings = await prisma.storeSettings.findUnique({
    where: { id: "store" },
  });
  return settings ?? {
    id: "store",
    storeName: "TRẠM XANH",
    address: "Số 2 Lê Quang Đạo, Từ Liêm, Hà Nội",
    phone: "0366 263 190",
    email: "hello@tramxanh.com",
    openingTime: "07:00",
    closingTime: "22:00",
    deliveryFee: 15000,
    customerCancelMinutes: 0,
    allowCash: true,
    allowBankTransfer: true,
    allowMomo: true,
    updatedAt: null,
  };
}

export async function GET() {
  const access = await requireRole(rolePermissions.storeSettings, "api");
  if (access instanceof NextResponse) {
    return access;
  }
  try {
    return NextResponse.json({ settings: await getStoreSettings() });
  } catch (error) {
    console.error("Failed to fetch store settings:", error);
    return NextResponse.json(
      { error: "Không thể tải cấu hình cửa hàng" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const actor = await requireRole(rolePermissions.storeSettings, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }
  const parsed = updateStoreSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Cấu hình cửa hàng không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  if (
    parsed.data.openingTime &&
    parsed.data.closingTime &&
    parsed.data.openingTime >= parsed.data.closingTime
  ) {
    return NextResponse.json(
      { error: "Giờ đóng cửa phải sau giờ mở cửa" },
      { status: 400 },
    );
  }

  try {
    const settings = await prisma.$transaction(async (transaction) => {
      const current = await transaction.storeSettings.upsert({
        where: { id: "store" },
        update: {},
        create: { id: "store" },
      });
      const opening = parsed.data.openingTime ?? current.openingTime;
      const closing = parsed.data.closingTime ?? current.closingTime;
      if (opening >= closing) {
        throw new RangeError("Giờ đóng cửa phải sau giờ mở cửa");
      }
      const hasPaymentMethod =
        (parsed.data.allowCash ?? current.allowCash) ||
        (parsed.data.allowBankTransfer ?? current.allowBankTransfer) ||
        (parsed.data.allowMomo ?? current.allowMomo);
      if (!hasPaymentMethod) {
        throw new RangeError("Cần bật ít nhất một phương thức thanh toán");
      }
      const updated = await transaction.storeSettings.update({
        where: { id: "store" },
        data: parsed.data,
      });
      await writeAuditLog(transaction, actor, {
        action: "STORE_SETTINGS_UPDATED",
        entityType: "StoreSettings",
        entityId: "store",
        details: { changes: parsed.data },
      });
      return updated;
    });
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }
    console.error("Failed to update store settings:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật cấu hình cửa hàng" },
      { status: 500 },
    );
  }
}
