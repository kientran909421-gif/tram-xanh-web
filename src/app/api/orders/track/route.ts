import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackOrderQuerySchema } from "@/lib/validations/order";

const notFoundResponse = () =>
  NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = trackOrderQuerySchema.safeParse({
    code: url.searchParams.get("code"),
    phone: url.searchParams.get("phone"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Vui lòng nhập mã đơn và số điện thoại hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        code: { equals: parsed.data.code.toUpperCase(), mode: "insensitive" },
        customerPhone: parsed.data.phone,
      },
      select: {
        code: true,
        status: true,
        paymentStatus: true,
        type: true,
        items: {
          select: {
            name: true,
            quantity: true,
            options: true,
          },
        },
        subtotal: true,
        discount: true,
        deliveryFee: true,
        total: true,
        payment: {
          select: {
            method: true,
            status: true,
          },
        },
        createdAt: true,
        statusUpdatedAt: true,
      },
    });

    if (!order) {
      return notFoundResponse();
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to track order:", error);
    return NextResponse.json(
      { error: "Không thể tra cứu đơn hàng lúc này" },
      { status: 500 },
    );
  }
}
