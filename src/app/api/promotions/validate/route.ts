import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcDiscount } from "@/lib/cart-utils";
import { promotionValidationSchema } from "@/lib/validations/promotion";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu gửi lên không hợp lệ" },
      { status: 400 },
    );
  }

  const parsed = promotionValidationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin mã giảm giá không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const code = parsed.data.code.toLocaleUpperCase("vi-VN");
  try {
    const promotion = await prisma.promotion.findFirst({
      where: {
        code: { equals: code, mode: "insensitive" },
      },
    });

    if (!promotion) {
      return NextResponse.json({
        valid: false,
        error: "Mã giảm giá không tồn tại.",
      });
    }

    if (!promotion.isActive) {
      return NextResponse.json({
        valid: false,
        error: "Mã giảm giá hiện không hoạt động.",
      });
    }

    const now = new Date();
    if (now < promotion.startsAt || now > promotion.expiresAt) {
      return NextResponse.json({
        valid: false,
        error: "Mã giảm giá chưa bắt đầu hoặc đã hết hạn.",
      });
    }

    if (parsed.data.subtotal < promotion.minOrder) {
      return NextResponse.json({
        valid: false,
        error: `Đơn hàng cần tối thiểu ${promotion.minOrder.toLocaleString("vi-VN")}đ để dùng mã này.`,
      });
    }

    if (
      promotion.usageLimit !== null &&
      promotion.usedCount >= promotion.usageLimit
    ) {
      return NextResponse.json({
        valid: false,
        error: "Mã giảm giá đã hết lượt sử dụng.",
      });
    }

    const discount = calcDiscount(parsed.data.subtotal, {
      type: promotion.type,
      value: promotion.value,
      maxDiscount: promotion.maxDiscount,
    });

    return NextResponse.json({
      valid: true,
      promotion: {
        code: promotion.code,
        type: promotion.type,
        value: promotion.value,
        maxDiscount: promotion.maxDiscount,
      },
      discount,
    });
  } catch (error) {
    console.error("Failed to validate promotion:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra mã giảm giá" },
      { status: 500 },
    );
  }
}
