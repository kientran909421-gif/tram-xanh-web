"use client";

import Link from "next/link";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu02Icon } from "@hugeicons/core-free-icons";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

const navigation = [
  { label: "Trang chủ", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Đặt bàn", href: "/reservation" },
  { label: "Theo dõi đơn", href: "/account/orders" },
];

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Mở menu điều hướng"
          />
        }
      >
        <HugeiconsIcon icon={Menu02Icon} size={20} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-950/45 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-[min(22rem,85vw)] flex-col gap-8 bg-[#fbf8f2] p-6 shadow-2xl transition-transform data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-stone-900">
              Điều hướng
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
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </Dialog.Close>
          </div>
          <nav aria-label="Điều hướng trên thiết bị di động">
            <ul className="grid gap-2">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    className="block rounded-lg px-3 py-3 font-medium text-stone-800 hover:bg-amber-100"
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
