import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { rolePermissions, canManageRole } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import {
  adminUserQuerySchema,
  createManagedUserSchema,
} from "@/lib/validations/admin-user";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const actor = await requireRole(rolePermissions.staffManagement, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }

  const params = new URL(request.url).searchParams;
  const parsed = adminUserQuerySchema.safeParse({
    page: params.get("page") ?? undefined,
    q: params.get("q") ?? undefined,
    role: params.get("role") ?? undefined,
    active: params.get("active") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bộ lọc tài khoản không hợp lệ" },
      { status: 400 },
    );
  }

  const filters: Prisma.UserWhereInput[] = [];
  if (parsed.data.q) {
    filters.push({
      OR: [
        { name: { contains: parsed.data.q, mode: "insensitive" } },
        { email: { contains: parsed.data.q, mode: "insensitive" } },
      ],
    });
  }
  if (parsed.data.role) {
    filters.push({ role: parsed.data.role });
  }
  if (parsed.data.active !== undefined) {
    filters.push({ isActive: parsed.data.active });
  }
  if (actor.role === "MANAGER") {
    filters.push({ role: { in: ["CASHIER", "BARISTA"] } });
  }
  const where: Prisma.UserWhereInput = { AND: filters };

  try {
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      page: parsed.data.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách tài khoản" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const actor = await requireRole(rolePermissions.staffManagement, "api");
  if (actor instanceof NextResponse) {
    return actor;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }

  const parsed = createManagedUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin tài khoản không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  if (!canManageRole(actor.role, parsed.data.role)) {
    return NextResponse.json(
      { error: "Bạn không được gán vai trò này" },
      { status: 403 },
    );
  }

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    const user = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone ?? null,
          role: parsed.data.role,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
      await writeAuditLog(transaction, actor, {
        action: "USER_CREATED",
        entityType: "User",
        entityId: created.id,
        details: { email: created.email, role: created.role },
      });
      return created;
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Email này đã được đăng ký" },
        { status: 409 },
      );
    }
    console.error("Failed to create managed user:", error);
    return NextResponse.json(
      { error: "Không thể tạo tài khoản" },
      { status: 500 },
    );
  }
}
