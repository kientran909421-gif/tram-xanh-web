"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type Address = {
  id: string;
  label: string;
  address: string;
  isDefault: boolean;
};

export function AccountProfile() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [profileResponse, addressResponse] = await Promise.all([
        fetch("/api/me/profile"),
        fetch("/api/me/addresses"),
      ]);
      const [profileResult, addressResult] = (await Promise.all([
        profileResponse.json(),
        addressResponse.json(),
      ])) as [
        { user?: CustomerProfile; error?: string },
        { addresses?: Address[]; error?: string },
      ];
      if (!profileResponse.ok || !profileResult.user) {
        setError(profileResult.error ?? "Không thể tải thông tin cá nhân");
        return;
      }
      if (!addressResponse.ok || !addressResult.addresses) {
        setError(addressResult.error ?? "Không thể tải địa chỉ");
        return;
      }
      setError("");
      setProfile(profileResult.user);
      setAddresses(addressResult.addresses);
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          phone: data.get("phone") || null,
        }),
      });
      const result = (await response.json()) as {
        user?: CustomerProfile;
        error?: string;
      };
      if (!response.ok || !result.user) {
        setError(result.error ?? "Không thể cập nhật thông tin");
        return;
      }
      setProfile(result.user);
      setMessage("Đã cập nhật thông tin.");
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    try {
      const response = await fetch("/api/me/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: data.get("label"),
          address: data.get("address"),
          isDefault: data.get("isDefault") === "on",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể lưu địa chỉ");
        return;
      }
      form.reset();
      await load();
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  async function updateAddress(address: Address, changes: Partial<Address>) {
    setError("");
    try {
      const response = await fetch(`/api/me/addresses/${address.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể cập nhật địa chỉ");
        return;
      }
      await load();
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  async function deleteAddress(address: Address) {
    setError("");
    try {
      const response = await fetch(`/api/me/addresses/${address.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể xóa địa chỉ");
        return;
      }
      await load();
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-4xl flex-1 gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Thông tin cá nhân</h1>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      {message ? <p className="text-sm text-green-800" role="status">{message}</p> : null}
      <form
        className="grid gap-4 rounded-2xl border border-border bg-card p-5"
        key={profile ? `${profile.id}:${profile.name}:${profile.phone ?? ""}` : "profile"}
        onSubmit={saveProfile}
      >
        <label className="grid gap-1 text-sm font-medium">
          Họ tên
          <input className="rounded-lg border border-border bg-background px-3 py-2" name="name" defaultValue={profile?.name ?? ""} required maxLength={120} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Email
          <input className="rounded-lg border border-border bg-muted px-3 py-2" value={profile?.email ?? ""} readOnly />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Số điện thoại
          <input className="rounded-lg border border-border bg-background px-3 py-2" name="phone" type="tel" defaultValue={profile?.phone ?? ""} />
        </label>
        <Button type="submit" disabled={!profile}>Lưu thông tin</Button>
      </form>

      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Địa chỉ giao hàng</h2>
        <form className="grid gap-3 rounded-2xl border border-border bg-card p-5" onSubmit={addAddress}>
          <label className="grid gap-1 text-sm font-medium">
            Nhãn địa chỉ
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="label" placeholder="Nhà riêng, công ty..." required maxLength={60} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Địa chỉ
            <textarea className="min-h-20 rounded-lg border border-border bg-background px-3 py-2" name="address" required minLength={5} maxLength={500} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="isDefault" type="checkbox" />
            Đặt làm địa chỉ mặc định
          </label>
          <Button type="submit">Thêm địa chỉ</Button>
        </form>
        {addresses.map((address) => (
          <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4" key={address.id}>
            <div>
              <p className="font-semibold">{address.label}{address.isDefault ? " · Mặc định" : ""}</p>
              <p className="text-sm text-muted-foreground">{address.address}</p>
            </div>
            <div className="flex gap-2">
              {!address.isDefault ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void updateAddress(address, { isDefault: true })}>
                  Chọn mặc định
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="destructive" onClick={() => void deleteAddress(address)}>
                Xóa
              </Button>
            </div>
          </article>
        ))}
        {addresses.length === 0 ? <p className="text-sm text-muted-foreground">Chưa lưu địa chỉ nào.</p> : null}
      </section>
    </main>
  );
}
