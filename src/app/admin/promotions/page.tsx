import { Suspense } from "react";
import { PromotionManager } from "@/components/admin/promotion-manager";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";

async function PromotionsContent() {
  await requireRole(adminPermissions.promotions, "page", "/admin/forbidden");
  return <PromotionManager />;
}

export default function AdminPromotionsPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <PromotionsContent />
    </Suspense>
  );
}
