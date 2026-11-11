import { Suspense } from "react";
import { StoreSettingsForm } from "@/components/admin/store-settings-form";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";

async function SettingsContent() {
  await requireRole(adminPermissions.settings, "page", "/admin/forbidden");
  return <StoreSettingsForm />;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <SettingsContent />
    </Suspense>
  );
}
