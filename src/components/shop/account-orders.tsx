"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AccountOrder = {
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
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    options: unknown;
  }>;
  payment: { method: string; status: string } | null;
};

type OrdersResponse = {
  items?: AccountOrder[];
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
  error?: string;
};

const statusLabels: Record<AccountOrder["status"], string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang chuẩn bị",
  READY: "Sẵn sàng",
  DELIVERING: "Đang giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const statusStyles: Record<AccountOrder["status"], string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-sky-100 text-sky-900",
  PREPARING: "bg-indigo-100 text-indigo-900",
  READY: "bg-emerald-100 text-emerald-900",
  DELIVERING: "bg-violet-100 text-violet-900",
  COMPLETED: "bg-green-100 text-green-900",
  CANCELLED: "bg-red-100 text-red-900",
};

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

export function AccountOrders() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/me/orders?page=${encodeURIComponent(String(page))}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const result = (await response.json()) as OrdersResponse;
        if (!response.ok || !result.items || !result.pagination) {
          throw new Error(result.error ?? "Không thể tải đơn hàng.");
        }

        setOrders(result.items);
        setTotalPages(result.pagination.totalPages);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải đơn hàng.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadOrders();
    return () => controller.abort();
  }, [page]);

  const goToPage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(nextPage));
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#805a3b]">
        Tài khoản
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#3f2d22]">
        Đơn hàng của tôi
      </h1>

      {loading ? (
        <div className="mt-8 grid gap-4" aria-label="Đang tải đơn hàng">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="h-28 animate-pulse rounded-2xl bg-[#e9e0d2]"
              key={index}
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800" role="alert">
          <p>{error}</p>
          <Button
            className="mt-3"
            type="button"
            variant="outline"
            onClick={() => router.refresh()}
          >
            Thử lại
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#d6c5b2] bg-[#fbf8f2] px-6 py-14 text-center">
          <h2 className="text-xl font-semibold text-[#3f2d22]">
            Bạn chưa có đơn nào
          </h2>
          <p className="mt-2 text-stone-600">
            Những đơn hàng bạn đặt sẽ hiển thị tại đây.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#68452f] px-5 text-sm font-semibold text-white hover:bg-[#513625]"
            href="/menu"
          >
            Xem menu
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4">
            {orders.map((order) => {
              const expanded = expandedCode === order.code;
              return (
                <article
                  className="overflow-hidden rounded-2xl border border-[#e9e0d2] bg-white"
                  key={order.code}
                >
                  <button
                    className="grid w-full gap-3 p-5 text-left sm:grid-cols-[1fr_auto_auto] sm:items-center"
                    type="button"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedCode(expanded ? null : order.code)
                    }
                  >
                    <span>
                      <span className="block font-semibold text-[#513625]">
                        {order.code}
                      </span>
                      <span className="mt-1 block text-sm text-stone-600">
                        {new Date(order.createdAt).toLocaleString("vi-VN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </span>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[order.status]}`}
                    >
                      {statusLabels[order.status]}
                    </span>
                    <span className="font-semibold text-[#3f2d22]">
                      {formatVND(order.total)}
                    </span>
                  </button>
                  {expanded ? (
                    <div className="border-t border-[#eee6da] bg-[#fffdf9] px-5 py-4">
                      <h2 className="font-semibold text-[#3f2d22]">
                        Chi tiết đơn hàng
                      </h2>
                      <ul className="mt-3 grid gap-3">
                        {order.items.map((item, index) => (
                          <li
                            className="flex items-start justify-between gap-4 text-sm"
                            key={`${item.name}-${index}`}
                          >
                            <span>
                              <span className="font-medium text-stone-800">
                                {item.name} × {item.quantity}
                              </span>
                              {optionNames(item.options).length > 0 ? (
                                <span className="mt-1 block text-stone-600">
                                  {optionNames(item.options).join(", ")}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 border-t border-[#eee6da] pt-3 text-sm text-stone-600">
                        <p>
                          Hình thức:{" "}
                          {order.type === "DELIVERY" ? "Giao hàng" : "Đến lấy"}
                        </p>
                        {order.payment ? (
                          <p className="mt-1">
                            Thanh toán: {order.payment.method} ·{" "}
                            {order.payment.status}
                          </p>
                        ) : null}
                        <Link
                          className="mt-3 inline-block font-medium text-[#68452f] underline underline-offset-4"
                          href="/track"
                        >
                          Tra cứu đơn hàng
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          <nav
            className="mt-6 flex items-center justify-between gap-4"
            aria-label="Phân trang đơn hàng"
          >
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Trang trước
            </Button>
            <span className="text-sm text-stone-600">
              Trang {page} / {Math.max(1, totalPages)}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Trang sau
            </Button>
          </nav>
        </>
      )}
    </main>
  );
}
