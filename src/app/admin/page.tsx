import { Suspense } from "react";
import { StaffDashboard } from "@/components/admin/staff-dashboard";
import { adminPermissions, roleHomePath } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import { redirect } from "next/navigation";

async function AdminDashboard() {
  const actor = await requireRole(adminPermissions.dashboard, "page");
  if (actor.role !== "ADMIN") {
    redirect(roleHomePath(actor.role));
  }
  return <StaffDashboard role="ADMIN" allowedRoles={["ADMIN"]} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12" />}>
      <AdminDashboard />
    </Suspense>
  );
}
