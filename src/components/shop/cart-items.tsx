"use client";

import Link from "next/link";
import { CartLine } from "@/components/shop/cart-line";
import { useCartStore } from "@/stores/cart";

export function CartItems() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground" role="status">
        Đang tải giỏ hàng...
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 py-10 text-center">
        <p className="font-medium text-primary">Giỏ hàng của bạn đang trống.</p>
        <p className="text-sm text-muted-foreground">
          Hãy chọn món yêu thích từ thực đơn nhé.
        </p>
        <Link
          className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary"
          href="/menu"
        >
          Xem menu
        </Link>
      </div>
    );
  }

  return (
    <div>
      {items.map((item) => (
        <CartLine item={item} key={item.key} />
      ))}
    </div>
  );
}
