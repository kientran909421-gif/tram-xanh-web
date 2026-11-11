"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setError("");
    setMessage("");
    if (data.get("newPassword") !== data.get("confirmPassword")) {
      setError("Mật khẩu mới nhập lại không khớp");
      setSaving(false);
      return;
    }
    try {
      const response = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể đổi mật khẩu");
        return;
      }
      form.reset();
      setMessage("Đã đổi mật khẩu.");
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-6">
      <form className="grid gap-4 rounded-2xl border border-border bg-card p-6" onSubmit={submit}>
        <div>
          <h1 className="text-3xl font-bold">Đổi mật khẩu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Mật khẩu mới cần ít nhất 12 ký tự.
          </p>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Mật khẩu hiện tại
          <input className="rounded-lg border border-border bg-background px-3 py-2" name="currentPassword" type="password" autoComplete="current-password" required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Mật khẩu mới
          <input className="rounded-lg border border-border bg-background px-3 py-2" name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Nhập lại mật khẩu mới
          <input className="rounded-lg border border-border bg-background px-3 py-2" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
        </label>
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        {message ? <p className="text-sm text-green-800" role="status">{message}</p> : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Đang cập nhật..." : "Đổi mật khẩu"}
        </Button>
      </form>
    </main>
  );
}
