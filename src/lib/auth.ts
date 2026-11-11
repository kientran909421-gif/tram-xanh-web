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
