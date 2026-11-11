import { Suspense } from "react";
import { AccountProfile } from "@/components/shop/account-profile";
import { requireRole } from "@/lib/rbac";

async function ProfileContent() {
  await requireRole(["CUSTOMER"], "page", "/");
  return <AccountProfile />;
}

export default function AccountProfilePage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-96 w-full max-w-4xl flex-1 px-4 py-12" />}>
      <ProfileContent />
    </Suspense>
  );
}
