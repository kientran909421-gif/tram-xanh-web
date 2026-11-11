"use client";

import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { useCartStore } from "@/stores/cart";
import { calcSubtotal } from "@/lib/cart-utils";
import { formatVND } from "@/lib/utils";
import { CartItems } from "@/components/shop/cart-items";
import { Button } from "@/components/ui/button";

export function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const subtotal = hasHydrated ? calcSubtotal(items) : 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/45 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-[min(30rem,100vw)] flex-col bg-card shadow-2xl outline-none">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">
                Giỏ hàng
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Kiểm tra món trước khi đặt hàng.
              </Dialog.Description>
            </div>
            <Dialog.Close
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label="Đóng giỏ hàng"
                />
              }
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </Dialog.Close>
          </header>
          <div className="flex-1 overflow-y-auto px-5">
            <CartItems />
          </div>
          {hasHydrated && items.length > 0 ? (
            <footer className="grid gap-4 border-t border-border bg-card px-5 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính</span>
                <span className="font-semibold text-primary">
                  {formatVND(subtotal)}
                </span>
              </div>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary"
                href="/cart"
                onClick={() => onOpenChange(false)}
              >
                Xem giỏ hàng
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full border border-muted-foreground px-5 text-sm font-semibold text-primary hover:bg-background"
                href="/checkout"
                onClick={() => onOpenChange(false)}
              >
                Thanh toán
              </Link>
            </footer>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
