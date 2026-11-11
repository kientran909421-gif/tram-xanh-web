import { Suspense } from "react";
import { OrderTracking } from "@/components/shop/order-tracking";

type TrackRouteProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ phone?: string | string[] }>;
};

async function TrackRouteContent({ params, searchParams }: TrackRouteProps) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const phone = Array.isArray(query.phone) ? query.phone[0] ?? "" : query.phone ?? "";

  return <OrderTracking code={code} phone={phone} />;
}

export default function TrackOrderPage(props: TrackRouteProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
          <div className="h-52 animate-pulse rounded-2xl bg-border" />
          <div className="mt-6 h-72 animate-pulse rounded-2xl bg-border" />
        </main>
      }
    >
      <TrackRouteContent {...props} />
    </Suspense>
  );
}
