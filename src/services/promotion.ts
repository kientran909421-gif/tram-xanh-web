import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcDiscount } from "@/lib/cart-utils";

type PromotionReader = Pick<Prisma.TransactionClient, "promotion">;

export type PromotionValidation =
  | {
      valid: true;
      promotion: {
        id: string;
        code: string;
        type: "PERCENT" | "FIXED";
        value: number;
        minOrder: number;
        maxDiscount: number | null;
        usageLimit: number | null;
        usedCount: number;
      };
      discount: number;
    }
  | { valid: false; error: string };

export async function validatePromotion(
  code: string,
  subtotal: number,
  reader: PromotionReader = prisma,
  now = new Date(),
): Promise<PromotionValidation> {
  const normalizedCode = code.trim().toLocaleUpperCase("vi-VN");
  const promotion = await reader.promotion.findFirst({
    where: {
      code: { equals: normalizedCode, mode: "insensitive" },
    },
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
      minOrder: true,
      maxDiscount: true,
      startsAt: true,
      expiresAt: true,
      usageLimit: true,
      usedCount: true,
      isActive: true,
    },
  });

  if (!promotion) {
    return { valid: false, error: "Mã giảm giá không tồn tại." };
  }

  if (!promotion.isActive) {
    return { valid: false, error: "Mã giảm giá hiện không hoạt động." };
  }

  if (now < promotion.startsAt || now > promotion.expiresAt) {
    return {
      valid: false,
      error: "Mã giảm giá chưa bắt đầu hoặc đã hết hạn.",
    };
  }

  if (subtotal < promotion.minOrder) {
    return {
      valid: false,
      error: `Đơn hàng cần tối thiểu ${promotion.minOrder.toLocaleString("vi-VN")}đ để dùng mã này.`,
    };
  }

  if (
    promotion.usageLimit !== null &&
    promotion.usedCount >= promotion.usageLimit
  ) {
    return { valid: false, error: "Mã giảm giá đã hết lượt sử dụng." };
  }

  return {
    valid: true,
    promotion: {
      id: promotion.id,
      code: promotion.code,
      type: promotion.type,
      value: promotion.value,
      minOrder: promotion.minOrder,
      maxDiscount: promotion.maxDiscount,
      usageLimit: promotion.usageLimit,
      usedCount: promotion.usedCount,
    },
    discount: calcDiscount(subtotal, {
      type: promotion.type,
      value: promotion.value,
      maxDiscount: promotion.maxDiscount,
    }),
  };
}
