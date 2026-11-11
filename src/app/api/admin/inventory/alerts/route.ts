import { NextResponse } from "next/server";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const access = await requireRole(rolePermissions.inventoryManagement, "api");
  if (access instanceof NextResponse) {
    return access;
  }
  try {
    const alerts = await prisma.inventoryAlert.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
        reportedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Failed to fetch inventory alerts:", error);
    return NextResponse.json(
      { error: "Không thể tải cảnh báo tồn kho" },
      { status: 500 },
    );
  }
}
