"use client";

import Link from "next/link";
import { useState } from "react";
import { CartItems } from "@/components/shop/cart-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart";
import { calcSubtotal } from "@/lib/cart-utils";
import { formatVND } from "@/lib/utils";

type AppliedPromotion = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number | null;
};

type ValidationResult =
  | {
      valid: true;
      promotion: AppliedPromotion;
      discount: number;
    }
  | { valid: false; error: string };

export function CartPage() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const subtotal = hasHydrated ? calcSubtotal(items) : 0;
  const [code, setCode] = useState("");
  const [promotion, setPromotion] = useState<AppliedPromotion | null>(null);
  const [discount, setDiscount] = useState(0);
  const [validatedSubtotal, setValidatedSubtotal] = useState<number | null>(
    null,
  );
  const [promotionError, setPromotionError] = useState("");
  const [validating, setValidating] = useState(false);
  const currentDiscount =
    promotion && validatedSubtotal === subtotal ? discount : 0;

  async function validatePromotion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPromotionError("");
    setPromotion(null);
    setDiscount(0);
    setValidatedSubtotal(null);

    if (!hasHydrated || !code.trim()) {
      setPromotionError("Vui lòng nhập mã giảm giá.");
      return;
    }

    setValidating(true);
    try {
      const response = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), subtotal }),
      });
      const result = (await response.json()) as ValidationResult & {
        error?: string;
      };

      if (!response.ok) {
        setPromotionError(result.error ?? "Không thể kiểm tra mã giảm giá.");
        return;
      }

      if (!result.valid) {
        setPromotionError(result.error);
        return;
      }

      setPromotion(result.promotion);
      setDiscount(result.discount);
      setValidatedSubtotal(subtotal);
      setCode(result.promotion.code);
    } catch {
      setPromotionError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setValidating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#805a3b]">
        Đơn hàng của bạn
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#3f2d22]">
        Giỏ hàng
      </h1>
      {hasHydrated && items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#d6c5b2] bg-[#fbf8f2] px-6 py-14 text-center">
          <h2 className="text-xl font-semibold text-[#3f2d22]">
            Giỏ hàng của bạn đang trống
          </h2>
          <p className="mt-2 text-stone-600">
            Khám phá thực đơn và chọn món yêu thích nhé.
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#68452f] px-6 text-sm font-semibold text-white hover:bg-[#513625]"
            href="/menu"
          >
            Xem menu
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_23rem]">
          <section className="rounded-2xl border border-[#e9e0d2] bg-white px-5 sm:px-7">
            <h2 className="sr-only">Các món trong giỏ hàng</h2>
            <CartItems />
          </section>
          <aside className="grid gap-5 rounded-2xl border border-[#e9e0d2] bg-[#fbf8f2] p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#3f2d22]">
              Tóm tắt đơn hàng
            </h2>
            <form className="grid gap-3" onSubmit={validatePromotion}>
              <label
                className="text-sm font-medium text-stone-700"
                htmlFor="promotion-code"
              >
                Mã giảm giá
              </label>
              <div className="flex gap-2">
                <Input
                  id="promotion-code"
                  className="min-w-0 border-[#e2d5c4] bg-white uppercase"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setPromotion(null);
                    setDiscount(0);
                    setValidatedSubtotal(null);
                    setPromotionError("");
                  }}
                  placeholder="Nhập mã"
                  maxLength={50}
                  disabled={!hasHydrated || items.length === 0}
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="border-[#9d7959] text-[#513625]"
                  disabled={validating || !hasHydrated || items.length === 0}
                >
                  {validating ? "Đang kiểm tra..." : "Áp dụng"}
                </Button>
              </div>
              {promotionError ? (
                <p className="text-sm text-red-700" role="alert">
                  {promotionError}
                </p>
              ) : null}
              {promotion && validatedSubtotal === subtotal ? (
                <p className="text-sm text-green-800" role="status">
                  Đã áp dụng mã {promotion.code}.
                </p>
              ) : null}
              {promotion && validatedSubtotal !== subtotal ? (
                <p className="text-sm text-amber-900" role="status">
                  Giỏ hàng đã thay đổi. Hãy áp dụng lại mã để cập nhật giảm giá.
                </p>
              ) : null}
            </form>
            <div className="grid gap-3 border-t border-[#e2d5c4] pt-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-stone-600">Tạm tính</span>
                <span className="font-medium text-stone-800">
                  {hasHydrated ? formatVND(subtotal) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-stone-600">Giảm giá</span>
                <span className="font-medium text-green-800">
                  {formatVND(currentDiscount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-[#e2d5c4] pt-3 text-base font-semibold">
                <span className="text-[#3f2d22]">Tổng cộng</span>
                <span className="text-[#513625]">
                  {hasHydrated
                    ? formatVND(Math.max(0, subtotal - currentDiscount))
                    : "—"}
                </span>
              </div>
            </div>
            <Link
              className={`inline-flex h-11 items-center justify-center rounded-full bg-[#68452f] px-5 text-sm font-semibold text-white hover:bg-[#513625] ${
                !hasHydrated || items.length === 0
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
              href="/checkout"
              aria-disabled={!hasHydrated || items.length === 0}
              tabIndex={!hasHydrated || items.length === 0 ? -1 : undefined}
            >
              Tiếp tục đặt hàng
            </Link>
            <Link
              className="text-center text-sm font-medium text-[#68452f] underline underline-offset-4"
              href="/menu"
            >
              Tiếp tục chọn món
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
