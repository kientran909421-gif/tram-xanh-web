"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartItems } from "@/components/shop/cart-items";
import { useCartStore } from "@/stores/cart";
import { calcSubtotal } from "@/lib/cart-utils";
import { DELIVERY_FEE } from "@/lib/site";
import { formatVND } from "@/lib/utils";
import { orderDetailsSchema } from "@/lib/validations/order";

type CheckoutValues = z.infer<typeof orderDetailsSchema>;
type AppliedPromotion = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number | null;
};

type PromotionResponse =
  | { valid: true; promotion: AppliedPromotion; discount: number }
  | { valid: false; error: string };

export function CheckoutForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const clearCart = useCartStore((state) => state.clear);
  const subtotal = hasHydrated ? calcSubtotal(items) : 0;
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(orderDetailsSchema),
    defaultValues: {
      type: "TAKEAWAY",
      customerName: initialName,
      customerPhone: initialPhone,
      address: "",
      note: "",
      paymentMethod: "CASH",
      promoCode: "",
    },
  });
  const orderType = useWatch({ control: form.control, name: "type" });
  const paymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });
  const promoCode = useWatch({ control: form.control, name: "promoCode" }) ?? "";
  const [promotion, setPromotion] = useState<AppliedPromotion | null>(null);
  const [promotionDiscount, setPromotionDiscount] = useState(0);
  const [validatedSubtotal, setValidatedSubtotal] = useState<number | null>(
    null,
  );
  const [promotionMessage, setPromotionMessage] = useState("");
  const [validatingPromotion, setValidatingPromotion] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (hasHydrated && items.length === 0) {
      router.replace("/menu");
    }
  }, [hasHydrated, items.length, router]);

  const deliveryFee = orderType === "DELIVERY" ? DELIVERY_FEE : 0;
  const discount =
    promotion && validatedSubtotal === subtotal ? promotionDiscount : 0;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  async function applyPromotion() {
    setPromotion(null);
    setPromotionDiscount(0);
    setValidatedSubtotal(null);
    setPromotionMessage("");

    if (!promoCode.trim()) {
      setPromotionMessage("Vui lòng nhập mã giảm giá.");
      return;
    }

    setValidatingPromotion(true);
    try {
      const response = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim(), subtotal }),
      });
      const result = (await response.json()) as PromotionResponse;

      if (!response.ok) {
        setPromotionMessage(
          "Có lỗi khi kiểm tra mã giảm giá. Vui lòng thử lại.",
        );
        return;
      }

      if (!result.valid) {
        setPromotionMessage(result.error);
        return;
      }

      setPromotion(result.promotion);
      setPromotionDiscount(result.discount);
      setValidatedSubtotal(subtotal);
      form.setValue("promoCode", result.promotion.code);
      setPromotionMessage(`Đã áp dụng mã ${result.promotion.code}.`);
    } catch {
      setPromotionMessage("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setValidatingPromotion(false);
    }
  }

  async function onSubmit(values: CheckoutValues) {
    setSubmitError("");
    if (!hasHydrated || items.length === 0) {
      setSubmitError("Giỏ hàng đang trống.");
      return;
    }

    const payload = {
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        optionIds: item.options.map((option) => option.id),
        quantity: item.quantity,
        ...(item.note ? { note: item.note } : {}),
      })),
      type: values.type,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      ...(values.type === "DELIVERY" ? { address: values.address } : {}),
      ...(values.note ? { note: values.note } : {}),
      paymentMethod: values.paymentMethod,
      ...(values.promoCode?.trim()
        ? { promoCode: values.promoCode.trim() }
        : {}),
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        code?: string;
        error?: string;
      };

      if (!response.ok || !result.code) {
        setSubmitError(result.error ?? "Không thể tạo đơn hàng.");
        return;
      }

      clearCart();
      router.push(
        `/track/${encodeURIComponent(result.code)}?phone=${encodeURIComponent(values.customerPhone)}`,
      );
    } catch {
      setSubmitError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    }
  }

  if (!hasHydrated || items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-center text-muted-foreground" role="status">
          {hasHydrated ? "Đang chuyển đến thực đơn..." : "Đang tải giỏ hàng..."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Hoàn tất đơn hàng
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Thanh toán
      </h1>
      <form
        className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_23rem]"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid gap-6">
          <section className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:p-7">
            <h2 className="text-lg font-semibold text-foreground">
              Thông tin nhận hàng
            </h2>
            <fieldset className="grid gap-3">
              <legend className="mb-2 text-sm font-medium text-foreground">
                Hình thức nhận hàng
              </legend>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-background">
                <input
                  type="radio"
                  value="TAKEAWAY"
                  {...form.register("type")}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">Đến lấy tại quán</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-background">
                <input
                  type="radio"
                  value="DELIVERY"
                  {...form.register("type")}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">
                  Giao hàng · {formatVND(DELIVERY_FEE)}
                </span>
              </label>
            </fieldset>
            {orderType === "DELIVERY" ? (
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Địa chỉ giao hàng
                <textarea
                  className="min-h-20 rounded-xl border border-border bg-card px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  maxLength={500}
                  {...form.register("address")}
                />
                {form.formState.errors.address?.message ? (
                  <span className="text-sm text-red-700">
                    {form.formState.errors.address.message}
                  </span>
                ) : null}
              </label>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Họ tên
                <Input
                  autoComplete="name"
                  {...form.register("customerName")}
                />
                {form.formState.errors.customerName?.message ? (
                  <span className="text-sm text-red-700">
                    {form.formState.errors.customerName.message}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Số điện thoại
                <Input
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  {...form.register("customerPhone")}
                />
                {form.formState.errors.customerPhone?.message ? (
                  <span className="text-sm text-red-700">
                    {form.formState.errors.customerPhone.message}
                  </span>
                ) : null}
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Ghi chú đơn hàng
              <textarea
                className="min-h-20 rounded-xl border border-border bg-card px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground"
                placeholder="Ghi chú thêm cho quán..."
                maxLength={1000}
                {...form.register("note")}
              />
            </label>
          </section>

          <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:p-7">
            <h2 className="text-lg font-semibold text-foreground">
              Phương thức thanh toán
            </h2>
            {(
              [
                ["CASH", "Tiền mặt"],
                ["BANK_TRANSFER", "Chuyển khoản"],
                ["MOMO", "MoMo"],
              ] as const
            ).map(([method, label]) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-background"
                key={method}
              >
                <input
                  type="radio"
                  value={method}
                  {...form.register("paymentMethod")}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
            {paymentMethod !== "CASH" ? (
              <p className="rounded-lg bg-background px-4 py-3 text-sm text-primary">
                Nhân viên sẽ liên hệ xác nhận thanh toán.
              </p>
            ) : null}
          </section>
        </div>

        <aside className="grid gap-5 rounded-2xl border border-border bg-background p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Đơn hàng của bạn
          </h2>
          <div className="max-h-80 overflow-y-auto">
            <CartItems />
          </div>
          <div className="grid gap-3 border-t border-border pt-4">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="checkout-promo"
            >
              Mã giảm giá
            </label>
            <div className="flex gap-2">
              <Input
                id="checkout-promo"
                className="min-w-0 bg-card uppercase"
                placeholder="Nhập mã"
                maxLength={50}
                {...form.register("promoCode")}
                onChange={(event) => {
                  form.setValue("promoCode", event.target.value);
                  setPromotion(null);
                  setPromotionDiscount(0);
                  setValidatedSubtotal(null);
                  setPromotionMessage("");
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={applyPromotion}
                disabled={validatingPromotion}
              >
                {validatingPromotion ? "Đang kiểm tra..." : "Áp dụng"}
              </Button>
            </div>
            {promotionMessage ? (
              <p
                className={`text-sm ${
                  promotion && validatedSubtotal === subtotal
                    ? "text-green-800"
                    : "text-red-700"
                }`}
                role="status"
              >
                {promotionMessage}
              </p>
            ) : null}
            {promotion && validatedSubtotal !== subtotal ? (
              <p className="text-sm text-primary" role="status">
                Giỏ hàng đã thay đổi. Hãy áp dụng lại mã giảm giá.
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 border-t border-border pt-4 text-sm">
            <SummaryRow label="Tạm tính" value={formatVND(subtotal)} />
            <SummaryRow label="Giảm giá" value={`−${formatVND(discount)}`} />
            <SummaryRow label="Phí giao hàng" value={formatVND(deliveryFee)} />
            <div className="flex items-center justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
              <span className="text-foreground">Tổng cộng</span>
              <span className="text-primary">{formatVND(total)}</span>
            </div>
          </div>
          {submitError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {submitError}
            </p>
          ) : null}
          <Button
            className="h-11 bg-primary text-primary-foreground hover:bg-primary"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Đang tạo đơn hàng..."
              : "Đặt hàng"}
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            Tổng tiền sẽ được máy chủ tính lại theo thực đơn hiện tại.
          </p>
        </aside>
      </form>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
