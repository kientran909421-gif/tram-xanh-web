"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: string;
  user: { name: string };
  menuItem: { name: string };
  orderItem: { order: { code: string } };
};

type ReviewPage = {
  reviews: Review[];
  page: number;
  totalPages: number;
};

export function ReviewManager() {
  const [data, setData] = useState<ReviewPage | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/reviews?page=${page}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as ReviewPage & { error?: string };
        if (!response.ok || !result.reviews) {
          throw new Error(result.error ?? "Không thể tải đánh giá");
        }
        setError("");
        setData(result);
      })
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Không thể tải đánh giá");
        }
      });
    return () => controller.abort();
  }, [page]);

  async function setVisibility(review: Review) {
    setError("");
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !review.isVisible }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể cập nhật đánh giá");
        return;
      }
      setData((current) =>
        current
          ? {
              ...current,
              reviews: current.reviews.map((item) =>
                item.id === review.id
                  ? { ...item, isVisible: !item.isVisible }
                  : item,
              ),
            }
          : current,
      );
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Đánh giá khách hàng</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ẩn đánh giá không phù hợp; mọi thay đổi được ghi vào nhật ký quản trị.
          </p>
        </div>
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <div className="grid gap-3">
          {data?.reviews.map((review) => (
            <article
              className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
              key={review.id}
            >
              <div>
                <h2 className="font-semibold">
                  {review.menuItem.name} · {review.rating}/5
                </h2>
                <p className="text-sm text-muted-foreground">
                  {review.user.name} · Đơn {review.orderItem.order.code} ·{" "}
                  {new Date(review.createdAt).toLocaleString("vi-VN")}
                </p>
                {review.comment ? <p className="mt-2">{review.comment}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {review.isVisible ? "Đang hiển thị công khai" : "Đang ẩn"}
                </p>
              </div>
              <Button
                type="button"
                variant={review.isVisible ? "destructive" : "outline"}
                onClick={() => void setVisibility(review)}
              >
                {review.isVisible ? "Ẩn đánh giá" : "Hiện đánh giá"}
              </Button>
            </article>
          ))}
          {data?.reviews.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              Chưa có đánh giá.
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!data || page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Trang trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {data?.totalPages ?? 1}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={!data || page >= data.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Trang sau
          </Button>
        </div>
      </div>
    </main>
  );
}
