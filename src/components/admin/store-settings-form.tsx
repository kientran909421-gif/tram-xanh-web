"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

type StoreSettings = {
  storeName: string;
  address: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
  deliveryFee: number;
  customerCancelMinutes: number;
  allowCash: boolean;
  allowBankTransfer: boolean;
  allowMomo: boolean;
};

const defaults: StoreSettings = {
  storeName: "TRẠM XANH",
  address: "Số 2 Lê Quang Đạo, Từ Liêm, Hà Nội",
  phone: "0366 263 190",
  email: "hello@tramxanh.com",
  openingTime: "07:00",
  closingTime: "22:00",
  deliveryFee: 15000,
  customerCancelMinutes: 0,
  allowCash: true,
  allowBankTransfer: true,
  allowMomo: true,
};

export function StoreSettingsForm() {
  const [settings, setSettings] = useState<StoreSettings>(defaults);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/settings")
      .then(async (response) => {
        const result = (await response.json()) as {
          settings?: StoreSettings;
          error?: string;
        };
        if (!response.ok || !result.settings) {
          throw new Error(result.error ?? "Không thể tải cấu hình");
        }
        if (active) setSettings(result.settings);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Không thể tải cấu hình",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setMessage("");
    const updated: StoreSettings = {
      storeName: String(formData.get("storeName")),
      address: String(formData.get("address")),
      phone: String(formData.get("phone")),
      email: String(formData.get("email")),
      openingTime: String(formData.get("openingTime")),
      closingTime: String(formData.get("closingTime")),
      deliveryFee: Number(formData.get("deliveryFee")),
      customerCancelMinutes: Number(formData.get("customerCancelMinutes")),
      allowCash: formData.get("allowCash") === "on",
      allowBankTransfer: formData.get("allowBankTransfer") === "on",
      allowMomo: formData.get("allowMomo") === "on",
    };
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const result = (await response.json()) as {
        settings?: StoreSettings;
        error?: string;
      };
      if (!response.ok || !result.settings) {
        setError(result.error ?? "Không thể lưu cấu hình");
        return;
      }
      setSettings(result.settings);
      setMessage("Đã lưu cấu hình cửa hàng.");
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <form
        className="mx-auto grid max-w-3xl gap-5 rounded-2xl border border-border bg-card p-6"
        onSubmit={save}
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Cấu hình cửa hàng
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chỉ ADMIN có thể thay đổi cấu hình hệ thống.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Tên cửa hàng
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              name="storeName"
              value={settings.storeName}
              onChange={(event) =>
                setSettings({ ...settings, storeName: event.target.value })
              }
              required
              maxLength={120}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Địa chỉ
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              name="address"
              value={settings.address}
              onChange={(event) =>
                setSettings({ ...settings, address: event.target.value })
              }
              required
              maxLength={500}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Điện thoại
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              name="phone"
              value={settings.phone}
              onChange={(event) =>
                setSettings({ ...settings, phone: event.target.value })
              }
              required
              maxLength={30}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Email
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              name="email"
              type="email"
              value={settings.email}
              onChange={(event) =>
                setSettings({ ...settings, email: event.target.value })
              }
              required
              maxLength={254}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Giờ mở cửa
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              name="openingTime"
              type="time"
              value={settings.openingTime}
              onChange={(event) =>
                setSettings({ ...settings, openingTime: event.target.value })
              }
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Giờ đóng cửa
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              name="closingTime"
              type="time"
              value={settings.closingTime}
              onChange={(event) =>
                setSettings({ ...settings, closingTime: event.target.value })
              }
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Phí giao hàng (đ)
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              name="deliveryFee"
              type="number"
              min={0}
              max={1000000}
              value={settings.deliveryFee}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  deliveryFee: Number(event.target.value),
                })
              }
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Thời hạn hủy đơn (phút)
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              name="customerCancelMinutes"
              type="number"
              min={0}
              max={1440}
              value={settings.customerCancelMinutes}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  customerCancelMinutes: Number(event.target.value),
                })
              }
              required
            />
            <span className="text-xs font-normal text-muted-foreground">
              0 = được hủy bất cứ lúc nào khi đơn còn PENDING.
            </span>
          </label>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">Thanh toán khả dụng</legend>
          {(
            [
              ["allowCash", "Tiền mặt"],
              ["allowBankTransfer", "Chuyển khoản"],
              ["allowMomo", "MoMo"],
            ] as const
          ).map(([name, label]) => (
            <label className="flex items-center gap-2 text-sm" key={name}>
              <input
                checked={settings[name]}
                name={name}
                type="checkbox"
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    [name]: event.target.checked,
                  })
                }
              />
              {label}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            Giao dịch hiện được thu ngân xác nhận thủ công; chưa kết nối cổng thanh toán.
          </p>
        </fieldset>
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        {message ? <p className="text-sm text-green-800" role="status">{message}</p> : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </form>
    </main>
  );
}
