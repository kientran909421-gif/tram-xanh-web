import { Suspense } from "react";
import { InventoryManager } from "@/components/admin/inventory-manager";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";

async function InventoryContent() {
  await requireRole(adminPermissions.inventory, "page", "/admin/forbidden");
  return <InventoryManager />;
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <InventoryContent />
    </Suspense>
  );
}
