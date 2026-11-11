import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: "store" },
      select: {
        storeName: true,
        address: true,
        phone: true,
        email: true,
        openingTime: true,
        closingTime: true,
        deliveryFee: true,
        allowCash: true,
        allowBankTransfer: true,
        allowMomo: true,
      },
    });
    return NextResponse.json({
      settings: settings ?? {
        storeName: "TRẠM XANH",
        address: "Số 2 Lê Quang Đạo, Từ Liêm, Hà Nội",
        phone: "0366 263 190",
        email: "hello@tramxanh.com",
        openingTime: "07:00",
        closingTime: "22:00",
        deliveryFee: 15000,
        allowCash: true,
        allowBankTransfer: true,
        allowMomo: true,
      },
    });
  } catch (error) {
    console.error("Failed to fetch public store settings:", error);
    return NextResponse.json(
      { error: "Không thể tải thông tin cửa hàng" },
      { status: 500 },
    );
  }
}
