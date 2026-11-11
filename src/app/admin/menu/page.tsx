import { Suspense } from "react";
import { MenuManager } from "@/components/admin/menu-manager";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";

async function MenuContent() {
  await requireRole(adminPermissions.menu, "page", "/admin/forbidden");
  return <MenuManager />;
}

export default function AdminMenuPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <MenuContent />
    </Suspense>
  );
}
