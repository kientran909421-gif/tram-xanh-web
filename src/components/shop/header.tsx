import Image from "next/image";
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
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <nav
        className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Điều hướng chính"
      >
                <Link className="shrink-0" href="/" aria-label={SITE_INFO.name}>
          <Image
            src="/logo-green.png"
            alt={SITE_INFO.name}
            width={909}
            height={333}
            priority
            className="h-9 w-auto sm:h-11"
          />
        </Link>
        <ul className="hidden items-center gap-6 lg:flex">
          {navigation.map((item) => (
            <li key={item.href}>
              <Link
                className="text-sm font-medium text-foreground transition-colors hover:text-primary"
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
      <div className="border-t border-muted px-4 py-1.5 text-center text-xs text-muted-foreground sm:hidden">
        <UserMenu user={session?.user ?? null} />
      </div>
    </header>
  );
}
