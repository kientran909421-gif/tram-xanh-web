import { Hero } from "@/components/shop/hero";
import Link from "next/link";
import { Suspense } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  Clock01Icon,
  Location01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { MenuCard } from "@/components/shop/menu-card";
import { prisma } from "@/lib/prisma";
import { SITE_INFO } from "@/lib/site";

async function FeaturedMenu() {
  const items = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      isAvailable: true,
    },
  });

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-background px-6 py-10 text-center text-muted-foreground">
        Các món nổi bật sẽ sớm được cập nhật. Mời bạn quay lại sau nhé!
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <MenuCard key={item.name} item={item} />
      ))}
    </div>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: typeof Clock01Icon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 text-primary">
        <HugeiconsIcon icon={icon} size={22} aria-hidden="true" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </article>
  );
}

async function StoreContactInfo() {
  const settings = await prisma.storeSettings.findUnique({
    where: { id: "store" },
    select: {
      storeName: true,
      address: true,
      phone: true,
      email: true,
      openingTime: true,
      closingTime: true,
    },
  });
  const name = settings?.storeName ?? SITE_INFO.name;
  const address = settings?.address ?? SITE_INFO.address;
  const phone = settings?.phone ?? SITE_INFO.phone;
  const email = settings?.email ?? SITE_INFO.email;
  const openingTime = settings?.openingTime ?? SITE_INFO.openingHours.opensAt;
  const closingTime = settings?.closingTime ?? SITE_INFO.openingHours.closesAt;
  const mapQuery = encodeURIComponent(address);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={Clock01Icon} title="Giờ mở cửa">
          Hằng ngày, {openingTime} – {closingTime}
        </InfoCard>
        <InfoCard icon={Location01Icon} title="Địa chỉ">
          <a
            className="hover:text-primary"
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noreferrer"
          >
            {address}
          </a>
        </InfoCard>
        <InfoCard icon={Call02Icon} title="Điện thoại">
          <a className="hover:text-primary" href={`tel:${phone}`}>
            {phone}
          </a>
        </InfoCard>
        <InfoCard icon={Mail01Icon} title="Email">
          <a className="hover:text-primary" href={`mailto:${email}`}>
            {email}
          </a>
        </InfoCard>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-background">
        <iframe
          className="h-72 w-full sm:h-96"
          src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
          title={`Bản đồ vị trí ${name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </>
  );
}

export default function Home() {
  return (
    <main>
      <Hero />

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Về chúng tôi
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Góc nhỏ dành cho những điều giản dị
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            {SITE_INFO.name} là nơi bạn có thể bắt đầu buổi sáng với một ly cà
            phê yêu thích, gặp gỡ bạn bè hay đơn giản là dành thời gian cho
            chính mình. Chúng tôi trân trọng từng nguyên liệu và từng khoảnh
            khắc tại quán.
          </p>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Từ thực đơn của quán
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Món nổi bật
              </h2>
            </div>
            <Link
              className="text-sm font-semibold text-primary underline underline-offset-4 hover:text-foreground"
              href="/menu"
            >
              Khám phá toàn bộ menu
            </Link>
          </div>
          <Suspense
            fallback={
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Đang tải món nổi bật">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    className="aspect-[4/3] animate-pulse rounded-2xl bg-border"
                    key={index}
                  />
                ))}
              </div>
            }
          >
            <FeaturedMenu />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Ghé thăm chúng tôi
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Luôn sẵn sàng đón bạn
          </h2>
        </div>
        <Suspense fallback={<p className="text-muted-foreground">Đang tải thông tin cửa hàng...</p>}>
          <StoreContactInfo />
        </Suspense>
      </section>
    </main>
  );
}
