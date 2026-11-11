import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b bg-card">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link className="text-lg font-semibold tracking-tight" href="/">
          Cafe
        </Link>
        <UserMenu user={session?.user ?? null} />
      </nav>
    </header>
  );
}
