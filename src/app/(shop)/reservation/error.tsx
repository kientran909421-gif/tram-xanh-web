"use client";

export default function ReservationErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-[#3f2d22]">
        Không thể mở trang đặt bàn
      </h1>
      <p className="mt-3 text-stone-600">
        Vui lòng thử lại sau ít phút.
      </p>
      <button
        className="mt-6 rounded-full bg-[#68452f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#513625]"
        onClick={reset}
      >
        Thử lại
      </button>
    </main>
  );
}
