import { Suspense } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { SITE_INFO } from "@/lib/site";
import {
  ClearCart,
  CopyCodeButton,
} from "@/components/shop/order-success-actions";

type SearchParams = Promise<{ code?: string; phone?: string }>;

export default function ThankYouPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={null}>
      <ThankYouContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ThankYouContent({ searchParams }: { searchParams: SearchParams }) {
  const { code, phone } = await searchParams;
  const safeCode = code && /^[A-Z0-9-]{6,30}$/.test(code) ? code : null;
  const safePhone = phone && /^0\d{9}$/.test(phone) ? phone : null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <ClearCart />
      <HugeiconsIcon
        className="text-primary"
        icon={CheckmarkCircle02Icon}
        size={64}
        aria-hidden="true"
      />
      <h1 className="mt-6 text-3xl font-bold text-foreground">
        Cảm ơn bạn đã đặt hàng!
      </h1>
      <p className="mt-3 text-muted-foreground">
        {SITE_INFO.name} đã nhận được đơn của bạn.{" "}
        {safePhone ? (
          <>
            Nhân viên sẽ gọi lại số{" "}
            <span className="font-semibold text-foreground">{safePhone}</span>{" "}
            để xác nhận đơn hàng.
          </>
        ) : (
          "Nhân viên sẽ gọi lại cho bạn để xác nhận đơn hàng."
        )}
      </p>

      {safeCode ? (
        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Mã đơn hàng của bạn</p>
          <p className="mt-2 text-2xl font-bold tracking-wider text-primary">
            {safeCode}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Hãy lưu mã này cùng số điện thoại để theo dõi đơn.
          </p>
          <div className="mt-4 flex justify-center">
            <CopyCodeButton code={safeCode} />
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {safeCode && safePhone ? (
          <Link
            href={`/track/${safeCode}?phone=${safePhone}`}
            className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Theo dõi đơn hàng
          </Link>
        ) : (
          <Link
            href="/track"
            className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Theo dõi đơn hàng
          </Link>
        )}
        <Link
          href="/menu"
          className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Tiếp tục xem menu
        </Link>
      </div>
    </main>
  );
}