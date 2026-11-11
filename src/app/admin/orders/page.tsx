import { Suspense } from "react";
import { requireRole } from "@/lib/rbac";
import { rolePermissions } from "@/lib/permissions";
import { OrderOperations } from "@/components/admin/order-operations";
import { CancellationRequests } from "@/components/admin/cancellation-requests";

async function OrdersContent() {
  const actor = await requireRole(rolePermissions.orderOperations, "page", "/");
  return (
    <div className="grid flex-1 content-start gap-6 p-4 sm:p-6">
      {actor.role === "ADMIN" || actor.role === "MANAGER" ? (
        <CancellationRequests />
      ) : null}
      <OrderOperations role={actor.role} />
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <OrdersContent />
    </Suspense>
  );
}
