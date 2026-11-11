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
      <p className="rounded-xl border border-dashed border-[#d6c5b2] bg-[#fbf8f2] px-6 py-10 text-center text-stone-600">
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
    <article className="rounded-2xl border border-[#e9e0d2] bg-white p-5">
      <div className="flex items-center gap-3 text-[#754c32]">
        <HugeiconsIcon icon={icon} size={22} aria-hidden="true" />
        <h3 className="font-semibold text-[#3f2d22]">{title}</h3>
      </div>
      <div className="mt-3 text-sm leading-6 text-stone-600">{children}</div>
    </article>
  );
}

export default function Home() {
  return (
    <main>
      <section className="relative isolate overflow-hidden bg-[#efe3d2]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_30%,rgba(160,115,75,0.22),transparent_55%)]" />
        <div className="mx-auto grid min-h-[480px] w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-24 lg:px-8">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#805a3b]">
              Chậm lại một chút, thưởng thức trọn vẹn
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-[#3f2d22] sm:text-5xl lg:text-6xl">
              Một tách cà phê, một ngày thật an nhiên
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-700 sm:text-lg">
              Ghé quán để thưởng thức cà phê thơm, món ngon và những phút giây
              thư thái bên người thân.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#68452f] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#513625]"
                href="/menu"
              >
                Xem menu
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#9d7959] bg-white/60 px-6 text-sm font-semibold text-[#513625] transition-colors hover:bg-white"
                href="/reservation"
              >
                Đặt bàn
              </Link>
            </div>
          </div>
          <div
            className="hidden aspect-square items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-[#dfc6a9] via-[#c6a27e] to-[#8f6345] shadow-[0_30px_90px_-40px_rgba(63,45,34,0.65)] md:flex"
            aria-hidden="true"
          >
            <div className="flex size-3/5 items-center justify-center rounded-full border border-white/50 bg-[#f7efe4]/70 shadow-inner">
              <HugeiconsIcon
                className="text-[#68452f]"
                icon={Clock01Icon}
                size={96}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#805a3b]">
            Về chúng tôi
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#3f2d22]">
            Góc nhỏ dành cho những điều giản dị
          </h2>
          <p className="mt-4 leading-7 text-stone-600">
            {SITE_INFO.name} là nơi bạn có thể bắt đầu buổi sáng với một ly cà
            phê yêu thích, gặp gỡ bạn bè hay đơn giản là dành thời gian cho
            chính mình. Chúng tôi trân trọng từng nguyên liệu và từng khoảnh
            khắc tại quán.
          </p>
        </div>
      </section>

      <section className="bg-[#f8f4ed]">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#805a3b]">
                Từ thực đơn của quán
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#3f2d22]">
                Món nổi bật
              </h2>
            </div>
            <Link
              className="text-sm font-semibold text-[#68452f] underline underline-offset-4 hover:text-[#3f2d22]"
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
                    className="aspect-[4/3] animate-pulse rounded-2xl bg-[#e9e0d2]"
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#805a3b]">
            Ghé thăm chúng tôi
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#3f2d22]">
            Luôn sẵn sàng đón bạn
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard icon={Clock01Icon} title="Giờ mở cửa">
            {SITE_INFO.openingHours.label}
          </InfoCard>
          <InfoCard icon={Location01Icon} title="Địa chỉ">
            <a
              className="hover:text-[#68452f]"
              href={SITE_INFO.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
            >
              {SITE_INFO.address}
            </a>
          </InfoCard>
          <InfoCard icon={Call02Icon} title="Điện thoại">
            <a className="hover:text-[#68452f]" href={`tel:${SITE_INFO.phone}`}>
              {SITE_INFO.phone}
            </a>
          </InfoCard>
          <InfoCard icon={Mail01Icon} title="Email">
            <a className="hover:text-[#68452f]" href={`mailto:${SITE_INFO.email}`}>
              {SITE_INFO.email}
            </a>
          </InfoCard>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#e9e0d2] bg-[#f8f4ed]">
          <iframe
            className="h-72 w-full sm:h-96"
            src={SITE_INFO.googleMapsEmbedUrl}
            title={`Bản đồ vị trí ${SITE_INFO.name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </main>
  );
}
