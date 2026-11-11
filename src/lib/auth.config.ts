import type { NextAuthConfig } from "next-auth";

export const authRoles = [
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "BARISTA",
  "CUSTOMER",
] as const;

export type AuthRole = (typeof authRoles)[number];

export function isAuthRole(role: unknown): role is AuthRole {
  return typeof role === "string" && authRoles.some((validRole) => validRole === role);
}

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        if (!user.id || !isAuthRole(user.role)) {
          throw new Error("Authenticated user is missing a valid id or role");
        }

        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (typeof token.id !== "string" || !isAuthRole(token.role)) {
        throw new Error("Auth token is missing a valid id or role");
      }

      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
