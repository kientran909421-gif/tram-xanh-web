"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { isAuthRole, type AuthRole } from "@/lib/auth.config";
import { Button } from "@/components/ui/button";
import { managedUserRoles } from "@/lib/permissions";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AuthRole;
  isActive: boolean;
  createdAt: string;
};

const roleLabels: Record<AuthRole, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  CASHIER: "Thu ngân",
  BARISTA: "Pha chế",
  CUSTOMER: "Khách hàng",
};

export function StaffManager({ actorRole }: { actorRole: AuthRole }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AuthRole | "">("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const roles = managedUserRoles(actorRole);

  const loadUsers = useCallback(
    async (
      search: string,
      targetPage: number,
      selectedRole: AuthRole | "",
      selectedActive: "" | "true" | "false",
    ) => {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());
        if (selectedRole) params.set("role", selectedRole);
        if (selectedActive) params.set("active", selectedActive);
        params.set("page", String(targetPage));
        const response = await fetch(`/api/admin/users?${params}`);
        const result = (await response.json()) as {
          users?: ManagedUser[];
          page?: number;
          totalPages?: number;
          error?: string;
        };
        if (!response.ok || !result.users) {
          setError(result.error ?? "Không thể tải danh sách tài khoản");
          return;
        }
        setError("");
        setUsers(result.users);
        setPage(result.page ?? targetPage);
        setTotalPages(result.totalPages ?? 1);
      } catch {
        setError("Không thể kết nối máy chủ");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void Promise.resolve().then(() => loadUsers("", 1, "", ""));
  }, [loadUsers]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? "") || null,
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? ""),
      isActive: true,
    };

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        user?: ManagedUser;
        error?: string;
      };
      if (!response.ok || !result.user) {
        setError(result.error ?? "Không thể tạo tài khoản");
        return;
      }
      form.reset();
      await loadUsers(query, page, roleFilter, activeFilter);
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(user: ManagedUser, changes: Partial<ManagedUser>) {
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = (await response.json()) as {
        user?: ManagedUser;
        error?: string;
      };
      if (!response.ok || !result.user) {
        setError(result.error ?? "Không thể cập nhật tài khoản");
        return;
      }
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? result.user! : item)),
      );
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8">
        <section>
          <h1 className="text-3xl font-bold text-foreground">
            Quản lý tài khoản
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tài khoản được khóa thay vì xóa để giữ nguyên lịch sử đơn hàng.
          </p>
        </section>

        <form
          className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={createUser}
        >
          <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-3">
            Tạo tài khoản
          </h2>
          <label className="grid gap-1 text-sm font-medium">
            Họ tên
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="name" required maxLength={120} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Email
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="email" type="email" required />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Số điện thoại
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="phone" type="tel" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Vai trò
            <select className="rounded-lg border border-border bg-background px-3 py-2" name="role" required>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Mật khẩu ban đầu (ít nhất 12 ký tự)
            <input className="rounded-lg border border-border bg-background px-3 py-2" name="password" type="password" minLength={12} required autoComplete="new-password" />
          </label>
          <div className="flex items-end">
            <Button className="w-full" disabled={saving} type="submit">
              {saving ? "Đang tạo..." : "Tạo tài khoản"}
            </Button>
          </div>
        </form>

        <section className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-60 flex-1 rounded-lg border border-border bg-background px-3 py-2"
              placeholder="Tìm theo tên hoặc email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void loadUsers(query, 1, roleFilter, activeFilter);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadUsers(query, 1, roleFilter, activeFilter)
              }
            >
              Tìm kiếm
            </Button>
            <select
              aria-label="Lọc theo vai trò"
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={roleFilter}
              onChange={(event) => {
                const role = event.target.value;
                if (role === "") {
                  setRoleFilter("");
                  void loadUsers(query, 1, "", activeFilter);
                } else if (isAuthRole(role)) {
                  setRoleFilter(role);
                  void loadUsers(query, 1, role, activeFilter);
                }
              }}
            >
              <option value="">Mọi vai trò</option>
              {roles.map((role) => (
                <option key={role} value={role}>{roleLabels[role]}</option>
              ))}
            </select>
            <select
              aria-label="Lọc theo trạng thái"
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={activeFilter}
              onChange={(event) => {
                const active = event.target.value;
                if (active === "" || active === "true" || active === "false") {
                  setActiveFilter(active);
                  void loadUsers(query, 1, roleFilter, active);
                }
              }}
            >
              <option value="">Mọi trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Đã khóa</option>
            </select>
          </div>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-muted text-foreground">
                <tr>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-muted-foreground">{user.email}</p>
                      {user.phone ? <p className="text-muted-foreground">{user.phone}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-md border border-border bg-background px-2 py-1"
                        value={user.role}
                        onChange={(event) => {
                          const role = event.target.value;
                          if (isAuthRole(role)) {
                            void updateUser(user, { role });
                          }
                        }}
                      >
                        {roles.includes(user.role) ? null : (
                          <option value={user.role}>{roleLabels[user.role]}</option>
                        )}
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? "Đang hoạt động" : "Đã khóa"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant={user.isActive ? "destructive" : "outline"}
                        onClick={() =>
                          void updateUser(user, { isActive: !user.isActive })
                        }
                      >
                        {user.isActive ? "Khóa" : "Mở khóa"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && users.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted-foreground" colSpan={4}>
                      Không có tài khoản phù hợp.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {loading ? <p className="p-4 text-sm text-muted-foreground">Đang tải...</p> : null}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={loading || page <= 1}
              onClick={() =>
                void loadUsers(query, page - 1, roleFilter, activeFilter)
              }
            >
              Trang trước
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={loading || page >= totalPages}
              onClick={() =>
                void loadUsers(query, page + 1, roleFilter, activeFilter)
              }
            >
              Trang sau
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
