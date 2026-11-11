import { NextResponse } from "next/server";
import { validatePromotion } from "@/services/promotion";
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

  try {
    const result = await validatePromotion(
      parsed.data.code,
      parsed.data.subtotal,
    );

    if (!result.valid) {
      return NextResponse.json(result);
    }

    return NextResponse.json({
      valid: true,
      promotion: {
        code: result.promotion.code,
        type: result.promotion.type,
        value: result.promotion.value,
        maxDiscount: result.promotion.maxDiscount,
      },
      discount: result.discount,
    });
  } catch (error) {
    console.error("Failed to validate promotion:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra mã giảm giá" },
      { status: 500 },
    );
  }
}
