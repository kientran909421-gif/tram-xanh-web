import { Suspense } from "react";
import { requireRole } from "@/lib/rbac";
import type { AuthRole } from "@/lib/auth.config";

const staffRoles: AuthRole[] = ["ADMIN", "MANAGER", "CASHIER", "BARISTA"];

async function AdminDashboard() {
  await requireRole(staffRoles);

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
