import { Suspense } from "react";
import { Footer } from "@/components/shop/footer";
import { Header } from "@/components/shop/header";
import { CartProvider } from "@/components/shop/cart-provider";

export default function ShopLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <CartProvider>
      <Suspense
        fallback={
          <header className="h-[65px] border-b border-[#e9e0d2] bg-[#fbf8f2]" />
        }
      >
        <Header />
      </Suspense>
      {children}
      <Footer />
    </CartProvider>
  );
}
