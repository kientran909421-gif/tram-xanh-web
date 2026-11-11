import { Suspense } from "react";
import { requireRole } from "@/lib/rbac";
import { adminPermissions } from "@/lib/permissions";

async function StaffContent() {
  await requireRole(adminPermissions.staff, "page", "/admin/forbidden");
  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[#3f2d22]">Nhân viên</h1>
      <p className="mt-2 text-stone-600">Quản lý tài khoản nhân viên.</p>
    </main>
  );
}

export default function StaffPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-8" />}>
      <StaffContent />
    </Suspense>
  );
}
