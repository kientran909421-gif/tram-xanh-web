import { NextResponse } from "next/server";
import { GET as getOrders } from "@/app/api/orders/route";
import { requireRole } from "@/lib/rbac";

export async function GET(request: Request) {
  const actor = await requireRole(["CASHIER"], "api");
  if (actor instanceof NextResponse) return actor;
  return getOrders(request);
}
