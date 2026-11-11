import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { auth, signOut } from "@/lib/auth";
import { isAuthRole } from "@/lib/auth.config";
import { SITE_INFO } from "@/lib/site";

const roleLabels = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  CASHIER: "Thu ngân",
  BARISTA: "Pha chế",
  CUSTOMER: "Khách hàng",
} as const;

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-1 flex-col bg-[#fbf8f2]">
          <div className="h-16 border-b border-[#e9e0d2] bg-white" />
          <main className="flex-1 p-6">
            <div className="h-64 animate-pulse rounded-xl bg-[#e9e0d2]" />
          </main>
        </div>
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}

async function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!isAuthRole(session.user.role) || session.user.role === "CUSTOMER") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#fbf8f2]">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-[#e9e0d2] bg-white px-4 sm:px-6">
        <Link className="hidden font-bold text-[#513625] sm:inline" href="/admin">
          {SITE_INFO.name} · Quản trị
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="max-w-40 truncate text-sm font-semibold text-[#3f2d22]">
              {session.user.name || session.user.email}
            </p>
            <p className="text-xs text-stone-500">
              {roleLabels[session.user.role]}
            </p>
          </div>
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
        <AdminSidebar role={session.user.role} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}
