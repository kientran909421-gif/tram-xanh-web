import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { adminPermissions } from "@/lib/permissions";

async function ForbiddenContent() {
  await requireRole(adminPermissions.dashboard, "page", "/");
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">
        403
      </p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Không có quyền</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Tài khoản của bạn không được phép truy cập trang quản trị này.
      </p>
      <Link
        className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        href="/admin"
      >
        Về Dashboard
      </Link>
    </main>
  );
}

export default function ForbiddenPage() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <ForbiddenContent />
    </Suspense>
  );
}
