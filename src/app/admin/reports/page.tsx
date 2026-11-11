import { Suspense } from "react";
import { SalesReport } from "@/components/admin/sales-report";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";

async function ReportsContent() {
  await requireRole(adminPermissions.reports, "page", "/admin/forbidden");
  return <SalesReport />;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <ReportsContent />
    </Suspense>
  );
}
