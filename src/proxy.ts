import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig, type AuthRole } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const roleHome: Record<AuthRole, string> = {
  ADMIN: "/admin",
  MANAGER: "/manager",
  CASHIER: "/cashier",
  BARISTA: "/barista",
  CUSTOMER: "/",
};

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const user = request.auth?.user;

  const isStaffRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/manager") ||
    pathname.startsWith("/cashier") ||
    pathname.startsWith("/barista");
  if (isStaffRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (user.role === "CUSTOMER") {
      return NextResponse.redirect(new URL(roleHome.CUSTOMER, request.url));
    }

    if (
      pathname.startsWith("/manager") &&
      user.role !== "ADMIN" &&
      user.role !== "MANAGER"
    ) {
      return NextResponse.redirect(new URL(roleHome[user.role], request.url));
    }
    if (
      pathname.startsWith("/cashier") &&
      user.role !== "ADMIN" &&
      user.role !== "CASHIER"
    ) {
      return NextResponse.redirect(new URL(roleHome[user.role], request.url));
    }
    if (
      pathname.startsWith("/barista") &&
      user.role !== "ADMIN" &&
      user.role !== "BARISTA"
    ) {
      return NextResponse.redirect(new URL(roleHome[user.role], request.url));
    }
  }

  if (pathname.startsWith("/account")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.redirect(new URL(roleHome[user.role], request.url));
    }
  }

  if (pathname === "/change-password" && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/manager/:path*",
    "/cashier/:path*",
    "/barista/:path*",
    "/account/:path*",
    "/change-password",
  ],
};
