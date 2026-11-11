import { Suspense } from "react";
import { CategoryManager } from "@/components/admin/category-manager";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";

async function CategoriesContent() {
  await requireRole(adminPermissions.categories, "page", "/admin/forbidden");
  return <CategoryManager />;
}

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-10 w-48 animate-pulse rounded bg-[#e9e0d2]" />
          <div className="mt-8 h-72 animate-pulse rounded-xl bg-[#e9e0d2]" />
        </main>
      }
    >
      <CategoriesContent />
    </Suspense>
  );
}
