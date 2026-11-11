import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import type { AuthRole } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";

type SessionUser = Session["user"];

export function requireRole(roles: readonly AuthRole[]): Promise<SessionUser>;
export function requireRole(
  roles: readonly AuthRole[],
  context: "api",
): Promise<SessionUser | NextResponse>;
export function requireRole(
  roles: readonly AuthRole[],
  context?: "page",
  forbiddenRedirect?: string,
): Promise<SessionUser>;
export async function requireRole(
  roles: readonly AuthRole[],
  context: "page" | "api" = "page",
  forbiddenRedirect = "/",
): Promise<SessionUser | NextResponse> {
  const session = await auth();

  if (!session?.user.id) {
    if (context === "api") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user?.isActive) {
    if (context === "api") {
      return NextResponse.json({ error: "Tài khoản không còn hoạt động" }, { status: 401 });
    }

    redirect("/login");
  }

  if (!roles.includes(user.role)) {
    if (context === "api") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    redirect(forbiddenRedirect);
  }

  return {
    ...session.user,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
