"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  getVisibleAdminNavigation,
} from "@/lib/permissions";
import type { AuthRole } from "@/lib/auth.config";

export function AdminSidebar({ role }: { role: AuthRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navigation = getVisibleAdminNavigation(role);

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-[#e9e0d2] bg-white lg:block">
        <AdminNavigation
          navigation={navigation}
          pathname={pathname}
          onNavigate={() => undefined}
        />
      </aside>
      <div className="flex items-center border-b border-[#e9e0d2] bg-white px-4 py-3 lg:hidden">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Mở menu quản trị"
              />
            }
          >
            <HugeiconsIcon icon={Menu02Icon} size={20} aria-hidden="true" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-950/45 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
            <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-[min(20rem,85vw)] bg-white shadow-2xl data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full">
              <div className="flex items-center justify-between border-b border-[#e9e0d2] px-5 py-4">
                <Dialog.Title className="font-semibold text-[#3f2d22]">
                  Quản trị
                </Dialog.Title>
                <Dialog.Close
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Đóng menu"
                    />
                  }
                >
                  <span aria-hidden="true" className="text-xl">
                    ×
                  </span>
                </Dialog.Close>
              </div>
              <AdminNavigation
                navigation={navigation}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
        <span className="ml-3 font-semibold text-[#3f2d22]">Quản trị</span>
      </div>
    </>
  );
}

function AdminNavigation({
  navigation,
  pathname,
  onNavigate,
}: {
  navigation: ReturnType<typeof getVisibleAdminNavigation>;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav aria-label="Điều hướng quản trị" className="p-4">
      <ul className="grid gap-1">
        {navigation.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.section}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#68452f] text-white"
                    : "text-stone-700 hover:bg-[#f5efe5] hover:text-[#3f2d22]"
                }`}
                href={item.href}
                onClick={onNavigate}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
