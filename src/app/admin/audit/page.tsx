import { Suspense } from "react";
import { AuditLogViewer } from "@/components/admin/audit-log-viewer";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";

async function AuditContent() {
  await requireRole(adminPermissions.audit, "page", "/admin/forbidden");
  return <AuditLogViewer />;
}

export default function AuditPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <AuditContent />
    </Suspense>
  );
}
