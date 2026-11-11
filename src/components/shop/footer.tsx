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
    <footer className="mt-auto bg-[#3f2d22] text-[#f8f1e7]">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Link className="text-xl font-bold tracking-tight" href="/">
            {SITE_INFO.name}
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-[#ddcdbb]">
            Một góc nhỏ để thưởng thức cà phê ngon và những phút giây thư thái.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Giờ mở cửa</h2>
          <p className="mt-3 flex items-center gap-2 text-sm text-[#ddcdbb]">
            <HugeiconsIcon icon={Clock01Icon} size={18} aria-hidden="true" />
            {SITE_INFO.openingHours.label}
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Địa chỉ</h2>
          <a
            className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#ddcdbb] hover:text-white"
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
          <div className="mt-3 grid gap-2 text-sm text-[#ddcdbb]">
            <a className="flex items-center gap-2 hover:text-white" href={`tel:${SITE_INFO.phone}`}>
              <HugeiconsIcon icon={Call02Icon} size={18} aria-hidden="true" />
              {SITE_INFO.phone}
            </a>
            <a className="flex items-center gap-2 hover:text-white" href={`mailto:${SITE_INFO.email}`}>
              <HugeiconsIcon icon={Mail01Icon} size={18} aria-hidden="true" />
              {SITE_INFO.email}
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/15 px-4 py-4 text-center text-xs text-[#ddcdbb]">
        © 2026 {SITE_INFO.name}. Đã đăng ký bản quyền.
      </div>
    </footer>
  );
}
