import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOrder, OrderError } from "@/services/order";
import { createOrderSchema } from "@/lib/validations/order";
import { rolePermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import type { AuthRole } from "@/lib/auth.config";
import type { Session } from "next-auth";

export async function POST(request: Request) {
  const session = await auth();
  let actor: Session["user"] | undefined;
  if (session?.user.id) {
    const allowedCreators: readonly AuthRole[] = [
      ...rolePermissions.counterOrders,
      "CUSTOMER",
    ];
    const access = await requireRole(allowedCreators, "api");
    if (access instanceof NextResponse) {
      return access;
    }
    actor = access;
  }

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
    const order = await createOrder(parsed.data, actor);
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
