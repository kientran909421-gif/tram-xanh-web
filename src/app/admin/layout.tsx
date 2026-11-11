import { Suspense } from "react";
import { adminPermissions } from "@/lib/permissions";
import { StaffShell } from "@/components/admin/staff-shell";

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-1 flex-col bg-background">
          <div className="h-16 border-b border-border bg-card" />
          <main className="flex-1 p-6">
            <div className="h-64 animate-pulse rounded-xl bg-border" />
          </main>
        </div>
      }
    >
      <StaffShell allowedRoles={adminPermissions.dashboard}>
        {children}
      </StaffShell>
    </Suspense>
  );
}
