import { adminPermissions, type AdminSection } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";

export async function AdminSectionPlaceholder({
  section,
  title,
}: {
  section: AdminSection;
  title: string;
}) {
  await requireRole(adminPermissions[section], "page", "/admin/forbidden");
  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[#3f2d22]">{title}</h1>
      <p className="mt-2 text-stone-600">Trang này sẽ được triển khai sau.</p>
    </main>
  );
}
