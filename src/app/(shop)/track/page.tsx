import { TrackForm } from "@/components/shop/track-form";

export default function TrackPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 lg:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Theo dõi đơn hàng
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Tra cứu đơn hàng
      </h1>
      <p className="mt-3 text-muted-foreground">
        Nhập mã đơn và số điện thoại đã dùng khi đặt hàng.
      </p>
      <div className="mt-7">
        <TrackForm />
      </div>
    </main>
  );
}
