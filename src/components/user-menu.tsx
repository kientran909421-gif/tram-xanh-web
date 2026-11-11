import Link from "next/link";
import { signOut } from "@/lib/auth";
import type { AuthRole } from "@/lib/auth.config";
import { Button } from "@/components/ui/button";

export function UserMenu({
  user,
}: {
  user: { name?: string | null; email?: string | null; role: AuthRole } | null;
}) {
  if (!user) {
    return (
      <Link
        className="inline-flex h-9 items-center justify-center rounded-4xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        href="/login"
      >
        Đăng nhập
      </Link>
    );
  }

  const isStaff = user.role !== "CUSTOMER";

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
      <span className="hidden text-muted-foreground sm:inline">
        {user.name ?? user.email}
      </span>
      <Link className="text-foreground/80 hover:text-foreground" href="/account/orders">
        Đơn của tôi
      </Link>
      {isStaff ? (
        <Link className="text-foreground/80 hover:text-foreground" href="/admin">
          Quản trị
        </Link>
      ) : null}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button type="submit" variant="outline">
          Đăng xuất
        </Button>
      </form>
    </div>
  );
}
