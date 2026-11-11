import { NextResponse } from "next/server";
import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  entityType: z.string().trim().min(1).max(80).optional(),
  action: z.string().trim().min(1).max(100).optional(),
});

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const access = await requireRole(rolePermissions.auditLog, "api");
  if (access instanceof NextResponse) {
    return access;
  }
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    page: params.get("page") ?? undefined,
    entityType: params.get("entityType") ?? undefined,
    action: params.get("action") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bộ lọc nhật ký không hợp lệ" }, { status: 400 });
  }

  const where = {
    ...(parsed.data.entityType ? { entityType: parsed.data.entityType } : {}),
    ...(parsed.data.action
      ? { action: { contains: parsed.data.action, mode: "insensitive" as const } }
      : {}),
  };
  try {
    const [events, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          actorId: true,
          actorEmail: true,
          actorRole: true,
          action: true,
          entityType: true,
          entityId: true,
          details: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return NextResponse.json({
      events,
      page: parsed.data.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error("Failed to fetch audit log:", error);
    return NextResponse.json(
      { error: "Không thể tải nhật ký hệ thống" },
      { status: 500 },
    );
  }
}
