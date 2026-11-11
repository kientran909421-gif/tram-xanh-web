"use client";

import { useState } from "react";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { useCartStore } from "@/stores/cart";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShoppingCart01Icon } from "@hugeicons/core-free-icons";

export function CartButton() {
  const [open, setOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const quantity = hasHydrated
    ? items.reduce((total, item) => total + item.quantity, 0)
    : 0;

  return (
    <>
      <button
        className="relative inline-flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-accent"
        type="button"
        aria-label={`Mở giỏ hàng, ${quantity} sản phẩm`}
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={ShoppingCart01Icon} size={22} aria-hidden="true" />
        <span className="absolute -right-0.5 -top-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          {quantity > 99 ? "99+" : quantity}
        </span>
      </button>
      <CartDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
