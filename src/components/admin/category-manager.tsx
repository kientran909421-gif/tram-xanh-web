"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/admin/DataTable";

type Category = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  _count: { items: number };
};

type CategoryResult = { categories: Category[]; error?: string };
type CategoryResponse = { category?: Omit<Category, "_count">; error?: string };

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const columns = useMemo<DataTableColumn<Category>[]>(
    () => [
      {
        key: "name",
        header: "Tên danh mục",
        render: (category) => (
          <span className="font-medium text-foreground">{category.name}</span>
        ),
      },
      {
        key: "slug",
        header: "Slug",
        render: (category) => (
          <code className="rounded bg-muted px-2 py-1 text-xs">
            {category.slug}
          </code>
        ),
      },
      {
        key: "sortOrder",
        header: "Thứ tự",
        render: (category) => category.sortOrder,
      },
      {
        key: "items",
        header: "Số món",
        render: (category) => category._count.items,
      },
      {
        key: "actions",
        header: "Thao tác",
        className: "w-40",
        render: (category) => (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setEditingCategory(category);
                setDialogOpen(true);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Sửa
            </Button>
            <Button
              onClick={() => setDeletingCategory(category)}
              size="sm"
              type="button"
              variant="destructive"
            >
              Xóa
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/categories", { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as CategoryResult;
        if (!response.ok || !result.categories) {
          throw new Error(result.error ?? "Không thể tải danh mục");
        }
        setCategories(result.categories);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setLoadError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [refreshKey]);

  const reload = useCallback(() => {
    setLoadError("");
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  async function saveCategory(values: {
    name: string;
    slug: string;
    sortOrder: number;
  }) {
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
        sortOrder: values.sortOrder,
      };
      const response = await fetch(
        editingCategory
          ? `/api/admin/categories/${editingCategory.id}`
          : "/api/admin/categories",
        {
          method: editingCategory ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as CategoryResponse;
      if (!response.ok || !result.category) {
        throw new Error(result.error ?? "Không thể lưu danh mục");
      }
      setDialogOpen(false);
      setEditingCategory(null);
      reload();
      toast.success(editingCategory ? "Đã cập nhật danh mục" : "Đã thêm danh mục");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu danh mục",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory() {
    if (!deletingCategory) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/categories/${deletingCategory.id}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Không thể xóa danh mục");
      }
      setDeletingCategory(null);
      reload();
      toast.success("Đã xóa danh mục");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa danh mục");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary">Quản lý nội dung</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">Danh mục</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sắp xếp và quản lý các nhóm món trong thực đơn.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingCategory(null);
              setDialogOpen(true);
            }}
            type="button"
          >
            Thêm danh mục
          </Button>
        </div>

        {loadError && (
          <Card className="mb-4 border-red-200 bg-red-50">
            <CardContent className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
              <p className="text-sm text-red-800">{loadError}</p>
              <Button onClick={reload} type="button" variant="outline">
                Tải lại
              </Button>
            </CardContent>
          </Card>
        )}

        <DataTable
          columns={columns}
          emptyMessage="Chưa có danh mục nào"
          loading={loading}
          pageSize={10}
          rowKey={(category) => category.id}
          rows={categories}
          searchableText={(category) =>
            `${category.name} ${category.slug} ${category.sortOrder}`
          }
          searchPlaceholder="Tìm theo tên hoặc slug..."
        />
      </div>

      <CategoryDialog
        key={dialogOpen ? editingCategory?.id ?? "new" : "closed"}
        category={editingCategory}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
          }
        }}
        onSave={saveCategory}
        open={dialogOpen}
        saving={saving}
      />
      <ConfirmDeleteDialog
        category={deletingCategory}
        deleting={deleting}
        onConfirm={deleteCategory}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeletingCategory(null);
          }
        }}
      />
    </main>
  );
}

function CategoryDialog({
  category,
  open,
  saving,
  onOpenChange,
  onSave,
}: {
  category: Category | null;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: { name: string; slug: string; sortOrder: number }) => void;
}) {
  const [name, setName] = useState(() => category?.name ?? "");
  const [slug, setSlug] = useState(() => category?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(() =>
    String(category?.sortOrder ?? 0),
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const order = Number(sortOrder);
    if (!Number.isSafeInteger(order)) {
      toast.error("Thứ tự phải là số nguyên");
      return;
    }
    onSave({ name, slug, sortOrder: order });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/45 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            {category ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Slug sẽ tự tạo theo tên nếu để trống.
          </Dialog.Description>
          <form className="mt-5 grid gap-4" onSubmit={submit}>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              Tên danh mục
              <Input
                autoFocus
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              Slug
              <Input
                onChange={(event) => setSlug(event.target.value)}
                placeholder="tu-dong-theo-ten"
                value={slug}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              Thứ tự hiển thị
              <Input
                onChange={(event) => setSortOrder(event.target.value)}
                required
                type="number"
                value={sortOrder}
              />
            </label>
            <div className="mt-2 flex justify-end gap-2">
              <Dialog.Close
                render={
                  <Button disabled={saving} type="button" variant="outline" />
                }
              >
                Hủy
              </Dialog.Close>
              <Button disabled={saving} type="submit">
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ConfirmDeleteDialog({
  category,
  deleting,
  onConfirm,
  onOpenChange,
}: {
  category: Category | null;
  deleting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root
      open={category !== null}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/45" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-foreground">
            Xóa danh mục?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Bạn có chắc muốn xóa “{category?.name}”? Danh mục đang có món sẽ
            không thể xóa.
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close
              render={
                <Button disabled={deleting} type="button" variant="outline" />
              }
            >
              Hủy
            </Dialog.Close>
            <Button
              disabled={deleting}
              onClick={onConfirm}
              type="button"
              variant="destructive"
            >
              {deleting ? "Đang xóa..." : "Xóa danh mục"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
