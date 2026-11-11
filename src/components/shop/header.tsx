import Link from "next/link";
import { auth } from "@/lib/auth";
import { SITE_INFO } from "@/lib/site";
import { UserMenu } from "@/components/user-menu";
import { MobileNavigation } from "@/components/shop/mobile-navigation";
import { CartButton } from "@/components/shop/cart-button";

const navigation = [
  { label: "Trang chủ", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Đặt bàn", href: "/reservation" },
  { label: "Theo dõi đơn", href: "/track" },
];

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 border-b border-[#e9e0d2] bg-[#fbf8f2]/95 backdrop-blur">
      <nav
        className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Điều hướng chính"
      >
        <Link
          className="shrink-0 text-lg font-bold tracking-tight text-[#513625] sm:text-xl"
          href="/"
        >
          {SITE_INFO.name}
        </Link>
        <ul className="hidden items-center gap-6 lg:flex">
          {navigation.map((item) => (
            <li key={item.href}>
              <Link
                className="text-sm font-medium text-stone-700 transition-colors hover:text-amber-900"
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 sm:gap-4">
          <CartButton />
          <div className="hidden sm:block">
            <UserMenu user={session?.user ?? null} />
          </div>
          <MobileNavigation />
        </div>
      </nav>
      <div className="border-t border-[#eee6da] px-4 py-1.5 text-center text-xs text-stone-600 sm:hidden">
        <UserMenu user={session?.user ?? null} />
      </div>
    </header>
  );
}
