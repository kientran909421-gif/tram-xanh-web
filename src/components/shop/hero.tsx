import Image from "next/image";
import Link from "next/link";
import { SITE_INFO } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20 lg:px-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-ring">
            Coffee &amp; Tea House
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Cứ chill thôi
          </h1>
          <p className="mt-2 text-xl text-primary-foreground/90 sm:text-2xl">
            Một ly đủ đầy năng lượng
          </p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-primary-foreground/80">
            Cà phê, trà và những góc xanh giữa phố. Đặt món online tại{" "}
            {SITE_INFO.name}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="inline-flex h-11 items-center rounded-full bg-ring px-6 text-sm font-semibold text-foreground transition-colors hover:bg-ring/90"
            >
              Xem menu
            </Link>
          </div>
        </div>

                <div className="relative mx-auto aspect-square w-full max-w-sm md:max-w-md lg:max-w-lg">
          <div
            className="absolute inset-6 rounded-full bg-primary-foreground/10 blur-3xl"
            aria-hidden="true"
          />
          <Image
            src="/hero.png"
            alt="Ly cà phê Trạm Xanh"
            fill
            priority
            sizes="(min-width: 1024px) 32rem, (min-width: 768px) 28rem, 90vw"
            className="relative object-contain drop-shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}