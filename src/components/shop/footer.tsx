"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  Clock01Icon,
  Location01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { SITE_INFO } from "@/lib/site";

type PublicStoreInfo = {
  storeName: string;
  address: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
};

export function Footer() {
  const [store, setStore] = useState<PublicStoreInfo>({
    storeName: SITE_INFO.name,
    address: SITE_INFO.address,
    phone: SITE_INFO.phone,
    email: SITE_INFO.email,
    openingTime: "07:00",
    closingTime: "22:00",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/store/settings")
      .then(async (response) => {
        const result = (await response.json()) as {
          settings?: PublicStoreInfo;
          error?: string;
        };
        if (!response.ok || !result.settings) {
          throw new Error(result.error ?? "Không thể tải thông tin cửa hàng");
        }
        if (active) setStore(result.settings);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải thông tin cửa hàng",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const openingHours = `${store.openingTime} - ${store.closingTime}`;

  return (
    <footer className="mt-auto bg-foreground text-background">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Image
  src="/logo-cream.png"
  alt={store.storeName}
  width={909}
  height={333}
  className="h-14 w-auto"
/>
          <p className="mt-3 max-w-xs text-sm leading-6 text-border">
            Một góc nhỏ để thưởng thức cà phê ngon và những phút giây thư thái.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Giờ mở cửa</h2>
          <p className="mt-3 flex items-center gap-2 text-sm text-border">
            <HugeiconsIcon icon={Clock01Icon} size={18} aria-hidden="true" />
            {openingHours}
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Địa chỉ</h2>
          <a
            className="mt-3 flex items-start gap-2 text-sm leading-6 text-border hover:text-primary-foreground"
            href={SITE_INFO.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
          >
            <HugeiconsIcon
              className="mt-1 shrink-0"
              icon={Location01Icon}
              size={18}
              aria-hidden="true"
            />
            {store.address}
          </a>
        </div>
        <div>
          <h2 className="font-semibold">Liên hệ</h2>
          <div className="mt-3 grid gap-2 text-sm text-border">
            <a className="flex items-center gap-2 hover:text-primary-foreground" href={`tel:${store.phone}`}>
              <HugeiconsIcon icon={Call02Icon} size={18} aria-hidden="true" />
              {store.phone}
            </a>
            <a className="flex items-center gap-2 hover:text-primary-foreground" href={`mailto:${store.email}`}>
              <HugeiconsIcon icon={Mail01Icon} size={18} aria-hidden="true" />
              {store.email}
            </a>
          </div>
        </div>
      </div>
      {error ? (
        <p className="px-4 pb-2 text-center text-xs text-amber-200" role="status">
          {error}
        </p>
      ) : null}
      <div className="border-t border-background/15 px-4 py-4 text-center text-xs text-border">
        © 2026 {store.storeName}. Đã đăng ký bản quyền.
      </div>
    </footer>
  );
}
