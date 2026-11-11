import { Suspense } from "react";
import { AdminSectionPlaceholder } from "@/components/admin/section-placeholder";

export default function AdminMenuPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <AdminSectionPlaceholder section="menu" title="Menu" />
    </Suspense>
  );
}
