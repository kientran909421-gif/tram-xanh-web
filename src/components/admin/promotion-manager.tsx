"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

type Promotion = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  startsAt: string;
  expiresAt: string;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

function toIsoDate(value: FormDataEntryValue | null): string {
  return new Date(String(value ?? "")).toISOString();
}

export function PromotionManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPromotions = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/promotions");
      const result = (await response.json()) as {
        promotions?: Promotion[];
        error?: string;
      };
      if (!response.ok || !result.promotions) {
        setError(result.error ?? "Không thể tải khuyến mãi");
        return;
      }
      setError("");
      setPromotions(result.promotions);
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadPromotions);
  }, [loadPromotions]);

  async function createPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: data.get("code"),
          description: data.get("description") || null,
          type: data.get("type"),
          value: Number(data.get("value")),
          minOrder: Number(data.get("minOrder")),
          maxDiscount: data.get("maxDiscount")
            ? Number(data.get("maxDiscount"))
            : null,
          startsAt: toIsoDate(data.get("startsAt")),
          expiresAt: toIsoDate(data.get("expiresAt")),
          usageLimit: data.get("usageLimit")
            ? Number(data.get("usageLimit"))
            : null,
          isActive: true,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể tạo khuyến mãi");
        return;
      }
      form.reset();
      await loadPromotions();
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  async function togglePromotion(promotion: Promotion) {
    setError("");
    try {
      const response = await fetch(`/api/admin/promotions/${promotion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !promotion.isActive }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể cập nhật khuyến mãi");
        return;
      }
      await loadPromotions();
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  async function updatePromotion(
    event: FormEvent<HTMLFormElement>,
    promotion: Promotion,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/promotions/${promotion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: data.get("description") || null,
          type: data.get("type"),
          value: Number(data.get("value")),
          minOrder: Number(data.get("minOrder")),
          maxDiscount: data.get("maxDiscount")
            ? Number(data.get("maxDiscount"))
            : null,
          startsAt: toIsoDate(data.get("startsAt")),
          expiresAt: toIsoDate(data.get("expiresAt")),
          usageLimit: data.get("usageLimit")
            ? Number(data.get("usageLimit"))
            : null,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể cập nhật khuyến mãi");
        return;
      }
      setEditingId(null);
      await loadPromotions();
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <h1 className="text-3xl font-bold text-foreground">Khuyến mãi</h1>
        <form
          className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={createPromotion}
        >
          <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-3">
            Tạo mã khuyến mãi
          </h2>
          <label className="grid gap-1 text-sm font-medium">
            Mã
            <input className="rounded-lg border border-border bg-background px-3 py-2 uppercase" name="code" required maxLength={50} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Hình thức
            <select className="rounded-lg border border-border bg-background px-3 py-2" name="type">
              <option value="PERCENT">Phần trăm</option>
              <option value="FIXED">Số tiền cố định</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Giá trị
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="value" type="number" min={1} required />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Đơn tối thiểu (đ)
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="minOrder" type="number" min={0} defaultValue={0} required />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Giảm tối đa (đ, tùy chọn)
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="maxDiscount" type="number" min={1} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Lượt sử dụng tối đa (tùy chọn)
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="usageLimit" type="number" min={1} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Bắt đầu
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="startsAt" type="datetime-local" required />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Kết thúc
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="expiresAt" type="datetime-local" required />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Mô tả
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="description" maxLength={500} />
          </label>
          <div className="flex items-end">
            <Button className="w-full" disabled={saving} type="submit">
              {saving ? "Đang lưu..." : "Tạo khuyến mãi"}
            </Button>
          </div>
        </form>

        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <div className="grid gap-3">
          {promotions.map((promotion) => (
            <article
              key={promotion.id}
              className="grid gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{promotion.code}</h2>
                  <p className="text-sm text-muted-foreground">
                    {promotion.type === "PERCENT"
                      ? `${promotion.value}%`
                      : `${promotion.value.toLocaleString("vi-VN")}đ`}
                    {" · "}Tối thiểu {promotion.minOrder.toLocaleString("vi-VN")}đ
                    {" · "}Đã dùng {promotion.usedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(promotion.startsAt).toLocaleString("vi-VN")} –{" "}
                    {new Date(promotion.expiresAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setEditingId((current) =>
                        current === promotion.id ? null : promotion.id,
                      )
                    }
                  >
                    {editingId === promotion.id ? "Đóng sửa" : "Sửa"}
                  </Button>
                  <Button
                    type="button"
                    variant={promotion.isActive ? "destructive" : "outline"}
                    onClick={() => void togglePromotion(promotion)}
                  >
                    {promotion.isActive ? "Tạm dừng" : "Kích hoạt"}
                  </Button>
                </div>
              </div>
              {editingId === promotion.id ? (
                <form
                  className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3"
                  onSubmit={(event) => void updatePromotion(event, promotion)}
                >
                  <label className="grid gap-1 text-sm">
                    Hình thức
                    <select className="rounded-lg border border-border bg-background px-3 py-2" name="type" defaultValue={promotion.type}>
                      <option value="PERCENT">Phần trăm</option>
                      <option value="FIXED">Số tiền cố định</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    Giá trị
                    <input className="rounded-lg border border-border bg-background px-3 py-2" name="value" type="number" min={1} defaultValue={promotion.value} required />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Đơn tối thiểu (đ)
                    <input className="rounded-lg border border-border bg-background px-3 py-2" name="minOrder" type="number" min={0} defaultValue={promotion.minOrder} required />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Giảm tối đa (đ)
                    <input className="rounded-lg border border-border bg-background px-3 py-2" name="maxDiscount" type="number" min={1} defaultValue={promotion.maxDiscount ?? ""} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Lượt sử dụng tối đa
                    <input className="rounded-lg border border-border bg-background px-3 py-2" name="usageLimit" type="number" min={1} defaultValue={promotion.usageLimit ?? ""} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Bắt đầu
                    <input className="rounded-lg border border-border bg-background px-3 py-2" name="startsAt" type="datetime-local" defaultValue={new Date(new Date(promotion.startsAt).getTime() - new Date(promotion.startsAt).getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} required />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Kết thúc
                    <input className="rounded-lg border border-border bg-background px-3 py-2" name="expiresAt" type="datetime-local" defaultValue={new Date(new Date(promotion.expiresAt).getTime() - new Date(promotion.expiresAt).getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} required />
                  </label>
                  <label className="grid gap-1 text-sm sm:col-span-2 lg:col-span-3">
                    Mô tả
                    <input className="rounded-lg border border-border bg-background px-3 py-2" name="description" maxLength={500} defaultValue={promotion.description ?? ""} />
                  </label>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </div>
                </form>
              ) : null}
            </article>
          ))}
          {promotions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có khuyến mãi.</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
