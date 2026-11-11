import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

const registrationSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Vui lòng kiểm tra lại thông tin",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "Email này đã được đăng ký" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  try {
    const user = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "CUSTOMER",
        },
        select: { id: true, name: true, email: true, role: true },
      });
      await writeAuditLog(transaction, created, {
        action: "USER_REGISTERED",
        entityType: "User",
        entityId: created.id,
      });
      return created;
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Email này đã được đăng ký" }, { status: 409 });
    }

    throw error;
  }
}
