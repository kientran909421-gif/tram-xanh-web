import Link from "next/link";
import { Toaster } from "sonner";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import type { AuthRole } from "@/lib/auth.config";
import { roleHomePath } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import { SITE_INFO } from "@/lib/site";

const roleLabels = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  CASHIER: "Thu ngân",
  BARISTA: "Pha chế",
  CUSTOMER: "Khách hàng",
} as const;

export async function StaffShell({
  allowedRoles,
  children,
}: {
  allowedRoles: readonly AuthRole[];
  children: React.ReactNode;
}) {
  const user = await requireRole(allowedRoles, "page", "/");

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
        <Link
          className="hidden font-bold text-primary sm:inline"
          href={roleHomePath(user.role)}
        >
          {SITE_INFO.name} · {roleLabels[user.role]}
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="max-w-40 truncate text-sm font-semibold text-foreground">
              {user.name || user.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {roleLabels[user.role]}
            </p>
          </div>
          <Link
            className="hidden text-sm text-foreground/80 hover:text-foreground sm:inline"
            href="/change-password"
          >
            Đổi mật khẩu
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline">
              Đăng xuất
            </Button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col lg:flex-row">
        <AdminSidebar role={user.role} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}
