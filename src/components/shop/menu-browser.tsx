"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MenuCard } from "@/components/shop/menu-card";
import {
  MenuItemDialog,
  type MenuSelection,
} from "@/components/shop/menu-item-dialog";
import type { MenuItemWithOptions } from "@/lib/menu";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart";

type Category = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export function MenuBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const categorySlug = searchParams.get("category") ?? "";
  const searchQuery = searchParams.get("q") ?? "";
  const minPriceFilter = searchParams.get("minPrice") ?? "";
  const maxPriceFilter = searchParams.get("maxPrice") ?? "";
  const [queryDraft, setQueryDraft] = useState({
    forQuery: searchQuery,
    value: searchQuery,
  });
  const queryInput =
    queryDraft.forQuery === searchQuery ? queryDraft.value : searchQuery;
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItemWithOptions[]>([]);
  const [categoriesError, setCategoriesError] = useState("");
  const [menuError, setMenuError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithOptions | null>(
    null,
  );
  const addItem = useCartStore((state) => state.addItem);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === categorySlug),
    [categories, categorySlug],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories", {
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          categories?: Category[];
          error?: string;
        };
        if (!response.ok || !result.categories) {
          throw new Error(result.error ?? "Không thể tải danh mục.");
        }

        setCategories(result.categories);
        setCategoriesError("");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setCategoriesError(
          error instanceof Error ? error.message : "Không thể tải danh mục.",
        );
      }
    }

    void loadCategories();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadItems() {
      setLoading(true);
      setMenuError("");

      try {
        const query = new URLSearchParams(searchString);
        const response = await fetch(`/api/menu?${query.toString()}`, {
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          items?: MenuItemWithOptions[];
          error?: string;
        };
        if (!response.ok || !result.items) {
          throw new Error(result.error ?? "Không thể tải thực đơn.");
        }

        setItems(result.items);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setMenuError(
          error instanceof Error ? error.message : "Không thể tải thực đơn.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadItems();
    return () => controller.abort();
  }, [searchString]);

  const updateQuery = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(window.location.search);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  function applyPriceRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams(searchString);
    const minPrice = String(formData.get("minPrice") ?? "").trim();
    const maxPrice = String(formData.get("maxPrice") ?? "").trim();
    if (minPrice) params.set("minPrice", minPrice);
    else params.delete("minPrice");
    if (maxPrice) params.set("maxPrice", maxPrice);
    else params.delete("maxPrice");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  useEffect(() => {
    if (queryInput === searchQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      updateQuery("q", queryInput.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [queryInput, searchQuery, updateQuery]);

  function handleAdd(item: MenuItemWithOptions, selection: MenuSelection) {
    const options = selection.options.map((option) => ({
        id: option.id,
        group: option.group,
        name: option.name,
        priceDelta: option.priceDelta,
      }));

    addItem({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      unitPrice: selection.unitPrice,
      quantity: selection.quantity,
      options,
      note: selection.note,
    });
    toast.success("Đã thêm vào giỏ");
  }

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Thực đơn
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Chọn món bạn yêu thích
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Cà phê, trà, sinh tố và bánh được chuẩn bị mỗi ngày tại quán.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5">
          <div>
            <h2 className="sr-only">Lọc theo danh mục</h2>
            {categoriesError ? (
              <p className="mb-3 text-sm text-red-700" role="alert">
                {categoriesError}
              </p>
            ) : null}
            <div
              className="flex gap-2 overflow-x-auto pb-2"
              role="tablist"
              aria-label="Danh mục món"
            >
              <button
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  !categorySlug
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-primary hover:bg-border"
                }`}
                type="button"
                role="tab"
                aria-selected={!categorySlug}
                onClick={() => updateQuery("category", "")}
              >
                Tất cả
              </button>
              {categories.map((category) => (
                <button
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    categorySlug === category.slug
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-primary hover:bg-border"
                  }`}
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={categorySlug === category.slug}
                  onClick={() => updateQuery("category", category.slug)}
                >
                  {category.name}
                </button>
              ))}
            </div>
            {categorySlug && !selectedCategory && categories.length > 0 ? (
              <p className="mt-2 text-sm text-primary">
                Danh mục “{categorySlug}” không tồn tại.{" "}
                <button
                  className="underline underline-offset-2"
                  type="button"
                  onClick={() => updateQuery("category", "")}
                >
                  Xem tất cả món
                </button>
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              className="max-w-xl border-border bg-card"
              type="search"
              placeholder="Tìm món theo tên..."
              aria-label="Tìm món theo tên"
              maxLength={100}
              value={queryInput}
              onChange={(event) =>
                setQueryDraft({
                  forQuery: searchQuery,
                  value: event.target.value,
                })
              }
            />
            <form
              className="flex flex-wrap items-end gap-2"
              key={`${minPriceFilter}:${maxPriceFilter}`}
              onSubmit={applyPriceRange}
            >
              <label className="grid gap-1 text-xs font-medium">
                Giá từ (đ)
                <input
                  className="w-32 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  name="minPrice"
                  type="number"
                  min={0}
                  max={10_000_000}
                  defaultValue={minPriceFilter}
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Đến (đ)
                <input
                  className="w-32 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  name="maxPrice"
                  type="number"
                  min={0}
                  max={10_000_000}
                  defaultValue={maxPriceFilter}
                />
              </label>
              <button
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
                type="submit"
              >
                Lọc giá
              </button>
            </form>
          </div>

          {menuError ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800"
              role="alert"
            >
              <p>{menuError}</p>
              <button
                className="mt-2 text-sm font-semibold underline underline-offset-2"
                type="button"
                onClick={() => router.refresh()}
              >
                Thử tải lại trang
              </button>
            </div>
          ) : loading ? (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
              aria-label="Đang tải thực đơn"
            >
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                  key={index}
                >
                  <div className="aspect-[4/3] animate-pulse bg-border" />
                  <div className="grid gap-3 p-4">
                    <div className="h-4 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-background px-6 py-14 text-center">
              <h2 className="text-lg font-semibold text-foreground">
                Không tìm thấy món phù hợp
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Hãy thử đổi danh mục hoặc từ khóa tìm kiếm.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {items.map((item) => (
                <MenuCard
                  item={item}
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <MenuItemDialog
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
        onAdd={handleAdd}
      />
    </>
  );
}
