import { Suspense } from "react";
import { requireRole } from "@/lib/rbac";
import { adminPermissions } from "@/lib/permissions";
import { StaffManager } from "@/components/admin/staff-manager";

async function StaffContent() {
  const user = await requireRole(adminPermissions.staff, "page", "/admin/forbidden");
  return <StaffManager actorRole={user.role} />;
}

export default function StaffPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <StaffContent />
    </Suspense>
  );
}
