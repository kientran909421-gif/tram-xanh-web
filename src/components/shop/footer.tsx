import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  Clock01Icon,
  Location01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { SITE_INFO } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto bg-foreground text-background">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Image
  src="/logo-cream.png"
  alt={SITE_INFO.name}
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
            {SITE_INFO.openingHours.label}
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
            {SITE_INFO.address}
          </a>
        </div>
        <div>
          <h2 className="font-semibold">Liên hệ</h2>
          <div className="mt-3 grid gap-2 text-sm text-border">
            <a className="flex items-center gap-2 hover:text-primary-foreground" href={`tel:${SITE_INFO.phone}`}>
              <HugeiconsIcon icon={Call02Icon} size={18} aria-hidden="true" />
              {SITE_INFO.phone}
            </a>
            <a className="flex items-center gap-2 hover:text-primary-foreground" href={`mailto:${SITE_INFO.email}`}>
              <HugeiconsIcon icon={Mail01Icon} size={18} aria-hidden="true" />
              {SITE_INFO.email}
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-background/15 px-4 py-4 text-center text-xs text-border">
        © 2026 {SITE_INFO.name}. Đã đăng ký bản quyền.
      </div>
    </footer>
  );
}
