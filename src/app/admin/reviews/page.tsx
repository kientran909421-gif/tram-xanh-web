import { Suspense } from "react";
import { ReviewManager } from "@/components/admin/review-manager";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";

async function ReviewsContent() {
  await requireRole(adminPermissions.reviews, "page", "/admin/forbidden");
  return <ReviewManager />;
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <ReviewsContent />
    </Suspense>
  );
}
