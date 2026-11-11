import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import type { AuthRole } from "@/lib/auth.config";

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

  if (!session?.user) {
    if (context === "api") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    redirect("/login");
  }

  if (!roles.includes(session.user.role)) {
    if (context === "api") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    redirect(forbiddenRedirect);
  }

  return session.user;
}
