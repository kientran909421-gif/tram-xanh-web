import { Suspense } from "react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { authRoles } from "@/lib/auth.config";
import { requireRole } from "@/lib/rbac";

async function ChangePasswordContent() {
  await requireRole(authRoles, "page", "/login");
  return <ChangePasswordForm />;
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-96 w-full max-w-xl flex-1 px-4 py-12 sm:px-6" />}>
      <ChangePasswordContent />
    </Suspense>
  );
}
