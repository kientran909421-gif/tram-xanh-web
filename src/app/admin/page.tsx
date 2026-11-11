import { Suspense } from "react";
import { requireRole } from "@/lib/rbac";
import { adminPermissions } from "@/lib/permissions";

async function AdminDashboard() {
  await requireRole(adminPermissions.dashboard, "page", "/admin/forbidden");

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12" />}>
      <AdminDashboard />
    </Suspense>
  );
}
