"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type TrackedOrder = {
  code: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "DELIVERING"
    | "COMPLETED"
    | "CANCELLED";
  type: "TAKEAWAY" | "DELIVERY";
  items: Array<{
    name: string;
    quantity: number;
    options: unknown;
  }>;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  payment: { method: string; status: string } | null;
  createdAt: string;
};

type TrackResult = {
  order?: TrackedOrder;
  error?: string;
};

const statusLabels: Record<TrackedOrder["status"], string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang chuẩn bị",
  READY: "Sẵn sàng",
  DELIVERING: "Đang giao hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const paymentLabels: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  MOMO: "MoMo",
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  REFUNDED: "Đã hoàn tiền",
};

const flow: TrackedOrder["status"][] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERING",
  "COMPLETED",
];

function optionNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((option) => {
    if (
      typeof option === "object" &&
      option !== null &&
      "name" in option &&
      typeof option.name === "string"
    ) {
      return [option.name];
    }

    return [];
  });
}

export function OrderTracking({
  code,
  phone,
}: {
  code: string;
  phone: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const terminalStatus = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function fetchOrder() {
      try {
        const query = new URLSearchParams({ code, phone });
        const response = await fetch(`/api/orders/track?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as TrackResult;

        if (!response.ok || !result.order) {
          terminalStatus.current = response.status === 404;
          if (active) {
            setError(
              result.error === "Không tìm thấy đơn hàng"
                ? "Không tìm thấy đơn hàng. Hãy kiểm tra lại mã đơn và số điện thoại."
                : result.error ?? "Không thể tải thông tin đơn hàng.",
            );
            setOrder(null);
            setLoading(false);
          }
          return;
        }

        terminalStatus.current =
          result.order.status === "COMPLETED" ||
          result.order.status === "CANCELLED";
        if (active) {
          setOrder(result.order);
          setError("");
          setLoading(false);
        }
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }

        if (active) {
          setError("Không thể kết nối máy chủ để cập nhật đơn hàng.");
          setLoading(false);
        }
      }
    }

    void fetchOrder();
    const interval = window.setInterval(() => {
      if (!terminalStatus.current) {
        void fetchOrder();
      }
    }, 15000);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [code, phone]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Đã sao chép mã đơn");
    } catch {
      toast.error("Không thể sao chép mã đơn trên thiết bị này.");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-52 animate-pulse rounded-2xl bg-[#e9e0d2]" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-[#e9e0d2]" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-[#3f2d22]">
          Chưa tìm thấy đơn hàng
        </h1>
        <p className="mt-3 text-stone-600">
          {error || "Hãy kiểm tra lại mã đơn và số điện thoại bạn đã cung cấp."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.refresh()}
          >
            Thử lại
          </Button>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#68452f] px-4 text-sm font-medium text-white hover:bg-[#513625]"
            href="/track"
          >
            Tra cứu lại
          </Link>
        </div>
      </main>
    );
  }

  const statuses =
    order.type === "DELIVERY"
      ? flow
      : flow.filter((status) => status !== "DELIVERING");
  const currentIndex = statuses.indexOf(order.status);
  const createdAt = new Date(order.createdAt);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-[#e9e0d2] bg-[#fbf8f2] p-5 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#805a3b]">
          Theo dõi đơn hàng
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-wide text-[#3f2d22] sm:text-3xl">
            {order.code}
          </h1>
          <Button type="button" variant="outline" size="sm" onClick={copyCode}>
            Sao chép mã
          </Button>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          Hãy lưu mã đơn và số điện thoại để theo dõi.
        </p>
        <p className="mt-2 text-sm text-stone-600">
          Đặt lúc{" "}
          {createdAt.toLocaleString("vi-VN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        {order.status === "CANCELLED" ? (
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-800">
            Đơn hàng đã được hủy.
          </p>
        ) : (
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {statuses.map((status, index) => {
              const isComplete = currentIndex >= index;
              return (
                <li
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                    isComplete
                      ? "border-[#9d7959] bg-white text-[#513625]"
                      : "border-[#e9e0d2] bg-white/50 text-stone-500"
                  }`}
                  key={status}
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isComplete
                        ? "bg-[#68452f] text-white"
                        : "bg-stone-200 text-stone-500"
                    }`}
                  >
                    {isComplete ? "✓" : index + 1}
                  </span>
                  <span className="text-sm font-medium">
                    {statusLabels[status]}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {order.status !== "CANCELLED" ? (
          <p className="mt-4 text-sm text-stone-600">
            Trạng thái hiện tại:{" "}
            <span className="font-semibold text-[#68452f]">
              {statusLabels[order.status]}
            </span>
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-[#e9e0d2] bg-white p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-[#3f2d22]">Chi tiết đơn</h2>
        <ul className="mt-4 divide-y divide-[#eee6da]">
          {order.items.map((item, index) => (
            <li className="py-4" key={`${item.name}-${index}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-800">{item.name}</p>
                  {optionNames(item.options).length > 0 ? (
                    <p className="mt-1 text-sm text-stone-600">
                      {optionNames(item.options).join(", ")}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm text-stone-600">
                  × {item.quantity}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid gap-3 border-t border-[#e9e0d2] pt-4 text-sm">
          <PriceRow label="Tạm tính" value={formatVND(order.subtotal)} />
          <PriceRow label="Giảm giá" value={`−${formatVND(order.discount)}`} />
          <PriceRow label="Phí giao hàng" value={formatVND(order.deliveryFee)} />
          <PriceRow
            label="Tổng cộng"
            value={formatVND(order.total)}
            emphasized
          />
        </div>
        {order.payment ? (
          <div className="mt-5 border-t border-[#e9e0d2] pt-4 text-sm">
            <p className="text-stone-600">
              Thanh toán:{" "}
              <span className="font-medium text-stone-800">
                {paymentLabels[order.payment.method] ?? order.payment.method}
              </span>
            </p>
            <p className="mt-1 text-stone-600">
              Trạng thái:{" "}
              <span className="font-medium text-stone-800">
                {paymentLabels[order.payment.status] ?? order.payment.status}
              </span>
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function PriceRow({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        emphasized
          ? "border-t border-[#e9e0d2] pt-3 text-base font-semibold text-[#3f2d22]"
          : "text-stone-600"
      }`}
    >
      <span>{label}</span>
      <span className={emphasized ? "text-[#513625]" : "text-stone-800"}>
        {value}
      </span>
    </div>
  );
}
