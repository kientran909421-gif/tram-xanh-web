"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
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
    | "SERVED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED"
    | "REFUNDED";
  type: "TAKEAWAY" | "DELIVERY";
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  statusUpdatedAt: string;
  paymentStatus: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    options: unknown;
    reviews: { id: string }[];
  }>;
  payment: { method: string; status: string } | null;
  cancellationRequests: { status: "PENDING" | "APPROVED" | "REJECTED" }[];
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
  SERVED: "Đã phục vụ",
  OUT_FOR_DELIVERY: "Đang giao",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

const statusStyles: Record<AccountOrder["status"], string> = {
  PENDING: "bg-gray-100 text-gray-800",
  CONFIRMED: "bg-sky-100 text-sky-900",
  PREPARING: "bg-amber-100 text-amber-900",
  READY: "bg-emerald-100 text-emerald-900",
  SERVED: "bg-emerald-200 text-emerald-950",
  OUT_FOR_DELIVERY: "bg-violet-100 text-violet-900",
  DELIVERED: "bg-green-200 text-green-950",
  COMPLETED: "bg-green-100 text-green-900",
  CANCELLED: "bg-red-100 text-red-900",
  REFUNDED: "bg-orange-100 text-orange-900",
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
  const [refreshIndex, setRefreshIndex] = useState(0);

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
  }, [page, refreshIndex]);

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

  async function cancelOrder(code: string) {
    setError("");
    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(code)}/cancel`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể hủy đơn hàng");
        return;
      }
      setRefreshIndex((current) => current + 1);
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  async function requestCancellation(code: string) {
    setError("");
    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(code)}/cancel-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể gửi yêu cầu hủy đơn");
        return;
      }
      setRefreshIndex((current) => current + 1);
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Tài khoản
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Đơn hàng của tôi
      </h1>

      {loading ? (
        <div className="mt-8 grid gap-4" aria-label="Đang tải đơn hàng">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="h-28 animate-pulse rounded-2xl bg-border"
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
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-background px-6 py-14 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Bạn chưa có đơn nào
          </h2>
          <p className="mt-2 text-muted-foreground">
            Những đơn hàng bạn đặt sẽ hiển thị tại đây.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary"
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
                  className="overflow-hidden rounded-2xl border border-border bg-card"
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
                      <span className="block font-semibold text-primary">
                        {order.code}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
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
                    <span className="font-semibold text-foreground">
                      {formatVND(order.total)}
                    </span>
                  </button>
                  {expanded ? (
                    <div className="border-t border-muted bg-card px-5 py-4">
                      <OrderTimeline order={order} />
                      <h2 className="font-semibold text-foreground">
                        Chi tiết đơn hàng
                      </h2>
                      <ul className="mt-3 grid gap-3">
                        {order.items.map((item, index) => (
                          <li
                            className="flex items-start justify-between gap-4 text-sm"
                            key={`${item.name}-${index}`}
                          >
                            <span>
                              <span className="font-medium text-foreground">
                                {item.name} × {item.quantity}
                              </span>
                              {optionNames(item.options).length > 0 ? (
                                <span className="mt-1 block text-muted-foreground">
                                  {optionNames(item.options).join(", ")}
                                </span>
                              ) : null}
                              {order.status === "COMPLETED" &&
                              item.reviews.length === 0 ? (
                                <ReviewEntry
                                  orderItemId={item.id}
                                  onSubmitted={() =>
                                    setRefreshIndex((current) => current + 1)
                                  }
                                />
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 border-t border-muted pt-3 text-sm text-muted-foreground">
                        <p>
                          Hình thức:{" "}
                          {order.type === "DELIVERY" ? "Giao hàng" : "Đến lấy"}
                        </p>
                        {order.payment ? (
                          <p className="mt-1">
                            Thanh toán: {order.payment.method} ·{" "}
                            {paymentStatusLabels[order.paymentStatus] ??
                              order.paymentStatus}
                          </p>
                        ) : null}
                        <Link
                          className="mt-3 inline-block font-medium text-primary underline underline-offset-4"
                          href="/track"
                        >
                          Tra cứu đơn hàng
                        </Link>
                      </div>
                      {order.status === "CONFIRMED" ? (
                        <div className="mt-4 border-t border-muted pt-3">
                          {order.cancellationRequests[0]?.status === "PENDING" ? (
                            <p className="text-sm text-muted-foreground">
                              Yêu cầu hủy đang chờ cửa hàng duyệt.
                            </p>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void requestCancellation(order.code)}
                            >
                              Yêu cầu hủy đơn
                            </Button>
                          )}
                          {order.cancellationRequests[0]?.status === "REJECTED" ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Yêu cầu trước đó đã bị từ chối.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {order.status === "PENDING" ? (
                    <div className="border-t border-muted px-5 py-3">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => void cancelOrder(order.code)}
                      >
                        Hủy đơn
                      </Button>
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
            <span className="text-sm text-muted-foreground">
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

const paymentStatusLabels: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  REFUNDED: "Đã hoàn tiền",
  PARTIALLY_REFUNDED: "Đã hoàn tiền một phần",
};

function OrderTimeline({ order }: { order: AccountOrder }) {
  const statuses =
    order.type === "DELIVERY"
      ? [
          "PENDING",
          "CONFIRMED",
          "PREPARING",
          "READY",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "COMPLETED",
        ]
      : ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED"];
  const currentIndex = statuses.indexOf(order.status);

  return (
    <section className="mb-5 rounded-xl border border-border bg-background p-4">
      <h3 className="font-semibold text-foreground">Tiến trình đơn hàng</h3>
      {order.status === "CANCELLED" || order.status === "REFUNDED" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Đơn {statusLabels[order.status].toLowerCase()}.
        </p>
      ) : (
        <ol className="mt-3 flex flex-wrap gap-2">
          {statuses.map((status, index) => (
            <li
              key={status}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                index <= currentIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {statusLabels[status as AccountOrder["status"]]}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Cập nhật lúc{" "}
        {new Date(order.statusUpdatedAt).toLocaleString("vi-VN", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
    </section>
  );
}

function ReviewEntry({
  orderItemId,
  onSubmitted,
}: {
  orderItemId: string;
  onSubmitted: () => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/me/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId,
          rating: Number(values.get("rating")),
          comment: values.get("comment"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể gửi đánh giá");
        return;
      }
      form.reset();
      onSubmitted();
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-3 grid gap-2 rounded-lg bg-background p-3" onSubmit={submit}>
      <label className="grid gap-1 text-xs font-medium">
        Đánh giá món
        <select className="rounded-md border border-border bg-card px-2 py-1.5" name="rating" defaultValue="5">
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>{rating} sao</option>
          ))}
        </select>
      </label>
      <textarea
        className="min-h-16 rounded-md border border-border bg-card px-2 py-1.5 text-xs"
        name="comment"
        placeholder="Chia sẻ cảm nhận (không bắt buộc)"
        maxLength={1000}
      />
      {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
      <Button className="w-fit" type="submit" size="sm" disabled={saving}>
        {saving ? "Đang gửi..." : "Gửi đánh giá"}
      </Button>
    </form>
  );
}
