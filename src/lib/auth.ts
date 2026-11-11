import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig, type AuthRole } from "@/lib/auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AuthRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: AuthRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: AuthRole;
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    async signIn({ user }) {
      if (!user.id || !user.role) {
        throw new Error("Cannot audit sign-in without user identity and role");
      }
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "AUTH_SIGN_IN",
          entityType: "User",
          entityId: user.id,
        },
      });
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const actorId = typeof token?.id === "string" ? token.id : null;
      const actorRole = token?.role;
      await prisma.auditLog.create({
        data: {
          actorId,
          actorEmail: typeof token?.email === "string" ? token.email : null,
          actorRole:
            actorRole === "ADMIN" ||
            actorRole === "MANAGER" ||
            actorRole === "CASHIER" ||
            actorRole === "BARISTA" ||
            actorRole === "CUSTOMER"
              ? actorRole
              : null,
          action: "AUTH_SIGN_OUT",
          entityType: "User",
          entityId: actorId,
        },
      });
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.isActive) {
          return null;
        }

        const passwordMatches = await compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
