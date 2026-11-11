"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Đã xảy ra lỗi trong trang quản trị
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Vui lòng thử lại.</p>
      <button
        className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        onClick={reset}
      >
        Thử lại
      </button>
    </main>
  );
}
