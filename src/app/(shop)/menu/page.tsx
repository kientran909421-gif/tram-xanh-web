import { Suspense } from "react";
import { MenuBrowser } from "@/components/shop/menu-browser";

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
          <div className="h-10 w-48 animate-pulse rounded bg-border" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                className="aspect-[4/3] animate-pulse rounded-2xl bg-border"
                key={index}
              />
            ))}
          </div>
        </main>
      }
    >
      <MenuBrowser />
    </Suspense>
  );
}
