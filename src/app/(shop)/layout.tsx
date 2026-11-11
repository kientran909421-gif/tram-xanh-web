import { Suspense } from "react";
import { Footer } from "@/components/shop/footer";
import { Header } from "@/components/shop/header";

export default function ShopLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <>
      <Suspense
        fallback={
          <header className="h-[65px] border-b border-[#e9e0d2] bg-[#fbf8f2]" />
        }
      >
        <Header />
      </Suspense>
      {children}
      <Footer />
    </>
  );
}
