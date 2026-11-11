import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const actor = await requireRole(
    ["ADMIN", "MANAGER", "CASHIER", "BARISTA", "CUSTOMER"],
    "api",
  );
  if (actor instanceof NextResponse) return actor;

  const { id } = await context.params;
  const andFilters = [];
  if (actor.role === "CUSTOMER") andFilters.push({ userId: actor.id });
  if (actor.role === "CASHIER") {
    andFilters.push({
      OR: [{ assignedCashierId: actor.id }, { createdById: actor.id }],
    });
  }
  if (actor.role === "BARISTA") andFilters.push({ assignedBaristaId: actor.id });

  try {
    const order =
      actor.role === "BARISTA"
        ? await prisma.order.findFirst({
            where: {
              OR: [
                { id },
                { code: { equals: id, mode: "insensitive" } },
              ],
              AND: andFilters,
            },
            select: {
              id: true,
              code: true,
              status: true,
              type: true,
              note: true,
              statusUpdatedAt: true,
              createdAt: true,
              items: {
                select: {
                  name: true,
                  quantity: true,
                  options: true,
                  note: true,
                },
              },
            },
          })
        : await prisma.order.findFirst({
            where: {
              OR: [
                { id },
                { code: { equals: id, mode: "insensitive" } },
              ],
              AND: andFilters,
            },
            select: {
              id: true,
              code: true,
              status: true,
              paymentStatus: true,
              type: true,
              customerName: true,
              customerPhone: true,
              address: true,
              note: true,
              subtotal: true,
              discount: true,
              deliveryFee: true,
              total: true,
              statusUpdatedAt: true,
              createdAt: true,
              items: {
                select: {
                  id: true,
                  name: true,
                  quantity: true,
                  unitPrice: true,
                  options: true,
                  note: true,
                },
              },
              payment: {
                select: {
                  method: true,
                  status: true,
                  amount: true,
                  amountTendered: true,
                  changeDue: true,
                  refundedAmount: true,
                },
              },
              assignedCashier: { select: { id: true, name: true } },
              assignedBarista: { select: { id: true, name: true } },
            },
          });
    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (error) {
    console.error("Failed to fetch order detail:", error);
    return NextResponse.json({ error: "Không thể tải chi tiết đơn hàng" }, { status: 500 });
  }
}
