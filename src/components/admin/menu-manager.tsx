"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OptionGroup = "SIZE" | "ICE" | "SUGAR" | "TOPPING";
type MenuOption = {
  id?: string;
  group: OptionGroup;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
};
type Category = { id: string; name: string; slug: string };
type MenuItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryId: string;
  category: Category;
  isAvailable: boolean;
  options: MenuOption[];
};
type MenuForm = {
  name: string;
  slug: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  isAvailable: boolean;
  options: MenuOption[];
};

const emptyForm: MenuForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  categoryId: "",
  imageUrl: "",
  isAvailable: true,
  options: [],
};
const optionGroups: { value: OptionGroup; label: string }[] = [
  { value: "SIZE", label: "Kích cỡ" },
  { value: "ICE", label: "Đá" },
  { value: "SUGAR", label: "Đường" },
  { value: "TOPPING", label: "Topping" },
];

export function MenuManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MenuForm>(emptyForm);

  const loadItems = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set("q", query.trim());
      if (categoryFilter) params.set("category", categoryFilter);
      const response = await fetch(`/api/admin/menu?${params}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        items?: MenuItem[];
        totalPages?: number;
        error?: string;
      };
      if (!response.ok || !result.items) {
        throw new Error(result.error ?? "Không thể tải thực đơn");
      }
      setItems(result.items);
      setTotalPages(result.totalPages ?? 1);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải thực đơn");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, page, query]);

  useEffect(() => {
    void fetch("/api/admin/categories", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as {
          categories?: Category[];
          error?: string;
        };
        if (!response.ok || !result.categories) {
          throw new Error(result.error ?? "Không thể tải danh mục");
        }
        setCategories(result.categories);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Không thể tải danh mục");
      });
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadItems);
  }, [loadItems]);

  function startCreate() {
    setEditingItem(null);
    setFormOpen(true);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setError("");
  }

  function startEdit(item: MenuItem) {
    setEditingItem(item);
    setFormOpen(true);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description ?? "",
      price: String(item.price),
      categoryId: item.categoryId,
      imageUrl: item.imageUrl ?? "",
      isAvailable: item.isAvailable,
      options: item.options.map((option) => ({ ...option })),
    });
    setError("");
  }

  function updateOption(index: number, changes: Partial<MenuOption>) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...changes } : option,
      ),
    }));
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const options = form.options.map(({ id, ...option }) => ({
      ...(editingItem && id ? { id } : {}),
      ...option,
    }));
    try {
      const response = await fetch(
        editingItem ? `/api/admin/menu/${editingItem.id}` : "/api/admin/menu",
        {
          method: editingItem ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
            description: form.description.trim() || null,
            price: Number(form.price),
            categoryId: form.categoryId,
            imageUrl: form.imageUrl.trim() || null,
            isAvailable: form.isAvailable,
            options,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể lưu món");
        return;
      }
      setForm(emptyForm);
      setEditingItem(null);
      setFormOpen(false);
      await loadItems();
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item: MenuItem) {
    setError("");
    try {
      const response = await fetch(`/api/admin/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể đổi trạng thái món");
        return;
      }
      await loadItems();
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quản lý thực đơn</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Món đã xuất hiện trong đơn hàng chỉ được ngừng bán, không xóa cứng.
            </p>
          </div>
          <Button type="button" onClick={startCreate}>Thêm món</Button>
        </div>

        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        {formOpen ? (
          <form
            className="grid gap-4 rounded-2xl border border-border bg-card p-5"
            onSubmit={saveItem}
          >
            <h2 className="text-lg font-semibold">
              {editingItem ? `Sửa ${editingItem.name}` : "Thêm món mới"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Tên món
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                  maxLength={120}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Slug (để trống để tự tạo)
                <Input
                  value={form.slug}
                  onChange={(event) =>
                    setForm({ ...form, slug: event.target.value })
                  }
                  maxLength={160}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Giá (đ)
                <Input
                  type="number"
                  min={0}
                  max={10_000_000}
                  value={form.price}
                  onChange={(event) =>
                    setForm({ ...form, price: event.target.value })
                  }
                  required
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Danh mục
                <select
                  className="rounded-lg border border-border bg-background px-3 py-2"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm({ ...form, categoryId: event.target.value })
                  }
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                Mô tả
                <textarea
                  className="min-h-20 rounded-lg border border-border bg-background px-3 py-2"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  maxLength={2000}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                URL hình ảnh (bucket Supabase)
                <Input
                  type="url"
                  value={form.imageUrl}
                  onChange={(event) =>
                    setForm({ ...form, imageUrl: event.target.value })
                  }
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(event) =>
                  setForm({ ...form, isAvailable: event.target.checked })
                }
              />
              Đang bán
            </label>

            <section className="grid gap-3 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Tùy chọn món</h3>
                  <p className="text-xs text-muted-foreground">
                    Mỗi nhóm kích cỡ, đá, đường chỉ chọn tối đa một tùy chọn.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      options: [
                        ...current.options,
                        {
                          group: "TOPPING",
                          name: "",
                          priceDelta: 0,
                          isAvailable: true,
                        },
                      ],
                    }))
                  }
                >
                  Thêm tùy chọn
                </Button>
              </div>
              {form.options.map((option, index) => (
                <div
                  className="grid gap-2 rounded-lg bg-background p-3 sm:grid-cols-[1fr_1.2fr_1fr_auto_auto]"
                  key={option.id ?? `new-${index}`}
                >
                  <label className="grid gap-1 text-xs">
                    Nhóm
                    <select
                      className="rounded-md border border-border bg-card px-2 py-2 text-sm"
                      value={option.group}
                      onChange={(event) => {
                        const group = optionGroups.find(
                          (candidate) => candidate.value === event.target.value,
                        )?.value;
                        if (group) updateOption(index, { group });
                      }}
                    >
                      {optionGroups.map((group) => (
                        <option key={group.value} value={group.value}>
                          {group.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs">
                    Tên tùy chọn
                    <Input
                      value={option.name}
                      onChange={(event) =>
                        updateOption(index, { name: event.target.value })
                      }
                      required
                      maxLength={80}
                    />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Chênh lệch giá (đ)
                    <Input
                      type="number"
                      value={option.priceDelta}
                      onChange={(event) =>
                        updateOption(index, {
                          priceDelta: Number(event.target.value),
                        })
                      }
                      required
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={option.isAvailable}
                      onChange={(event) =>
                        updateOption(index, {
                          isAvailable: event.target.checked,
                        })
                      }
                    />
                    Đang bán
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        options: current.options.filter(
                          (_, optionIndex) => optionIndex !== index,
                        ),
                      }))
                    }
                  >
                    Xóa
                  </Button>
                </div>
              ))}
            </section>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || categories.length === 0}>
                {saving ? "Đang lưu..." : "Lưu món"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(emptyForm);
                  setEditingItem(null);
                  setFormOpen(false);
                }}
              >
                Hủy
              </Button>
            </div>
          </form>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Input
            className="min-w-52 flex-1"
            placeholder="Tìm tên món"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
          <select
            className="rounded-lg border border-border bg-background px-3 py-2"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Mọi danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3">
          {loading ? <p role="status">Đang tải thực đơn...</p> : null}
          {items.map((item) => (
            <article
              className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
              key={item.id}
            >
              <div>
                <h2 className="font-semibold">{item.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {item.category.name} · {item.price.toLocaleString("vi-VN")}đ ·{" "}
                  {item.isAvailable ? "Đang bán" : "Ngừng bán"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.options.length
                    ? item.options
                        .map((option) => `${option.group}: ${option.name}`)
                        .join(" · ")
                    : "Chưa có tùy chọn"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => startEdit(item)}
                >
                  Sửa
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={item.isAvailable ? "destructive" : "outline"}
                  onClick={() => void toggleAvailability(item)}
                >
                  {item.isAvailable ? "Ngừng bán" : "Hiện bán"}
                </Button>
              </div>
            </article>
          ))}
          {!loading && items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              Không tìm thấy món phù hợp.
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading || page <= 1}
            onClick={() => setPage((current) => current - 1)}
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
            onClick={() => setPage((current) => current + 1)}
          >
            Trang sau
          </Button>
        </div>
      </div>
    </main>
  );
}
