import { Suspense } from "react";
import { requireRole } from "@/lib/rbac";
import { rolePermissions } from "@/lib/permissions";
import { OrderOperations } from "@/components/admin/order-operations";

async function OrdersContent() {
  const actor = await requireRole(rolePermissions.orderOperations, "page", "/");
  return <OrderOperations role={actor.role} />;
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <OrdersContent />
    </Suspense>
  );
}
