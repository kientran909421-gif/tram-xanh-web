import { Suspense } from "react";
import { AdminSectionPlaceholder } from "@/components/admin/section-placeholder";

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <AdminSectionPlaceholder section="orders" title="Đơn hàng" />
    </Suspense>
  );
}
