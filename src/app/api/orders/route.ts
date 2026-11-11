import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOrder, OrderError } from "@/services/order";
import { createOrderSchema } from "@/lib/validations/order";

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

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin đặt hàng không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const session = await auth();
    const order = await createOrder(parsed.data, session?.user.id);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "Không thể tạo đơn hàng lúc này" },
      { status: 500 },
    );
  }
}
