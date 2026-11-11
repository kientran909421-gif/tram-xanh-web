"use client";

export default function CategoriesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-[#3f2d22]">
        Không thể tải danh mục
      </h1>
      <p className="mt-2 text-sm text-stone-600">Vui lòng thử lại sau.</p>
      <button
        className="mt-5 rounded-full bg-[#68452f] px-5 py-2.5 text-sm font-semibold text-white"
        onClick={reset}
      >
        Thử lại
      </button>
    </main>
  );
}
