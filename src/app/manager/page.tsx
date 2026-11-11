import { Suspense } from "react";
import { StaffShell } from "@/components/admin/staff-shell";
import { StaffDashboard } from "@/components/admin/staff-dashboard";

export default function ManagerPage() {
  return (
    <Suspense fallback={<main className="flex-1 p-8" />}>
      <StaffShell allowedRoles={["ADMIN", "MANAGER"]}>
        <StaffDashboard
          role="MANAGER"
          allowedRoles={["ADMIN", "MANAGER"]}
        />
      </StaffShell>
    </Suspense>
  );
}
