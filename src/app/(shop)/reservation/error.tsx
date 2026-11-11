"use client";

export default function ReservationErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Không thể mở trang đặt bàn
      </h1>
      <p className="mt-3 text-muted-foreground">
        Vui lòng thử lại sau ít phút.
      </p>
      <button
        className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary"
        onClick={reset}
      >
        Thử lại
      </button>
    </main>
  );
}
