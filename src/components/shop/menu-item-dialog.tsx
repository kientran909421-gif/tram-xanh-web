"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Coffee01Icon } from "@hugeicons/core-free-icons";
import { Dialog } from "@base-ui/react/dialog";
import type { MenuItemWithOptions } from "@/lib/menu";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type MenuOption = MenuItemWithOptions["options"][number];

type ReviewData = {
  averageRating: number | null;
  total: number;
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: { name: string };
  }[];
};

function SingleOptionGroup({
  itemId,
  title,
  options,
  selectedId,
  onSelect,
}: {
  itemId: string;
  title: string;
  options: MenuOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-foreground">
        {title} <span className="font-normal text-muted-foreground">· Chọn 1</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-background"
            key={option.id}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name={`${option.group}-${itemId}`}
                value={option.id}
                checked={selectedId === option.id}
                onChange={() => onSelect(option.id)}
                className="accent-primary"
              />
              <span className="text-sm font-medium text-foreground">
                {option.name}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">
              {option.priceDelta > 0
                ? `+${formatVND(option.priceDelta)}`
                : "Không phụ thu"}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ItemReviews({ slug }: { slug: string }) {
  const [data, setData] = useState<ReviewData | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/menu/${encodeURIComponent(slug)}/reviews`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as ReviewData & { error?: string };
        if (!response.ok) {
          throw new Error(result.error ?? "Không thể tải đánh giá");
        }
        setData(result);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Failed to load menu item reviews:", error);
        }
      });
    return () => controller.abort();
  }, [slug]);

  if (!data || data.total === 0) {
    return null;
  }

  return (
    <section className="mt-4 border-t border-border pt-4">
      <h3 className="text-sm font-semibold text-foreground">
        Đánh giá · {data.averageRating?.toFixed(1)} / 5 ({data.total})
      </h3>
      <ul className="mt-2 grid gap-2">
        {data.reviews.slice(0, 3).map((review) => (
          <li className="rounded-lg bg-background p-3 text-sm" key={review.id}>
            <p className="font-medium">
              {review.user.name} · {review.rating}/5
            </p>
            {review.comment ? (
              <p className="mt-1 text-muted-foreground">{review.comment}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export type MenuSelection = {
  options: MenuOption[];
  quantity: number;
  note: string;
  unitPrice: number;
  totalPrice: number;
};

type MenuItemDialogProps = {
  item: MenuItemWithOptions | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: MenuItemWithOptions, selection: MenuSelection) => void;
};

export function MenuItemDialog({
  item,
  open,
  onOpenChange,
  onAdd,
}: MenuItemDialogProps) {
  if (!item) {
    return null;
  }

  return (
    <MenuItemDialogContent
      item={item}
      open={open}
      onOpenChange={onOpenChange}
      onAdd={onAdd}
      key={item.id}
    />
  );
}

function MenuItemDialogContent({
  item,
  open,
  onOpenChange,
  onAdd,
}: {
  item: MenuItemWithOptions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: MenuItemWithOptions, selection: MenuSelection) => void;
}) {
  const sizeOptions = item.options.filter((option) => option.group === "SIZE");
  const iceOptions = item.options.filter((option) => option.group === "ICE");
  const sugarOptions = item.options.filter((option) => option.group === "SUGAR");
  const toppingOptions = item.options.filter(
    (option) => option.group === "TOPPING",
  );
  const [selectedSizeId, setSelectedSizeId] = useState(
    sizeOptions[0]?.id ?? "",
  );
  const [selectedIceId, setSelectedIceId] = useState(
    iceOptions.find((option) => option.name === "Bình thường")?.id ??
      iceOptions[0]?.id ??
      "",
  );
  const [selectedSugarId, setSelectedSugarId] = useState(
    sugarOptions.find((option) => option.name === "Bình thường")?.id ??
      sugarOptions[0]?.id ??
      "",
  );
  const [selectedToppingIds, setSelectedToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const selectedSize =
    sizeOptions.find((option) => option.id === selectedSizeId) ?? null;
  const selectedIce =
    iceOptions.find((option) => option.id === selectedIceId) ?? null;
  const selectedSugar =
    sugarOptions.find((option) => option.id === selectedSugarId) ?? null;
  const selectedToppings = toppingOptions.filter((option) =>
    selectedToppingIds.includes(option.id),
  );
  const unitPrice =
    item.price +
    [selectedSize, selectedIce, selectedSugar, ...selectedToppings].reduce(
      (total, option) => total + (option?.priceDelta ?? 0),
      0,
    );
  const totalPrice = unitPrice * quantity;

  function toggleTopping(option: MenuOption) {
    setSelectedToppingIds((current) =>
      current.includes(option.id)
        ? current.filter((id) => id !== option.id)
        : [...current, option.id],
    );
  }

  function handleAdd() {
    if (
      !item ||
      !item.isAvailable ||
      (sizeOptions.length > 0 && !selectedSize) ||
      (iceOptions.length > 0 && !selectedIce) ||
      (sugarOptions.length > 0 && !selectedSugar)
    ) {
      return;
    }

    onAdd(item, {
      options: [
        ...[selectedSize, selectedIce, selectedSugar].filter(
          (option): option is MenuOption => option !== null,
        ),
        ...selectedToppings,
      ],
      quantity,
      note: note.trim(),
      unitPrice,
      totalPrice,
    });
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/55 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl bg-card shadow-2xl outline-none">
          <div className="relative aspect-[16/8] shrink-0 overflow-hidden bg-gradient-to-br from-accent via-accent to-ring">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                unoptimized
                sizes="(max-width: 672px) 100vw, 672px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-primary">
                <HugeiconsIcon icon={Coffee01Icon} size={76} aria-hidden="true" />
              </div>
            )}
            <Dialog.Close
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-3 top-3 rounded-full bg-card/90"
                  aria-label="Đóng chi tiết món"
                />
              }
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </Dialog.Close>
          </div>
          <div className="grid gap-6 p-5 sm:p-7">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Dialog.Title className="text-2xl font-semibold text-foreground">
                    {item.name}
                  </Dialog.Title>
                  <p className="mt-1 font-semibold text-primary">
                    {formatVND(item.price)}
                  </p>
                </div>
                {!item.isAvailable ? (
                  <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                    Hết hàng
                  </span>
                ) : null}
              </div>
              {item.description ? (
                <Dialog.Description className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </Dialog.Description>
              ) : null}
              <ItemReviews slug={item.slug} />
            </div>

            <SingleOptionGroup
              itemId={item.id}
              title="Kích cỡ"
              options={sizeOptions}
              selectedId={selectedSizeId}
              onSelect={setSelectedSizeId}
            />
            <SingleOptionGroup
              itemId={item.id}
              title="Lượng đá"
              options={iceOptions}
              selectedId={selectedIceId}
              onSelect={setSelectedIceId}
            />
            <SingleOptionGroup
              itemId={item.id}
              title="Lượng đường"
              options={sugarOptions}
              selectedId={selectedSugarId}
              onSelect={setSelectedSugarId}
            />

            {toppingOptions.length > 0 ? (
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-foreground">
                  Topping <span className="font-normal text-muted-foreground">· Tùy chọn</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {toppingOptions.map((option) => (
                    <label
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-background"
                      key={option.id}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedToppingIds.includes(option.id)}
                          onChange={() => toggleTopping(option)}
                          className="size-4 accent-primary"
                        />
                        <span className="text-sm font-medium text-foreground">
                          {option.name}
                        </span>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {option.priceDelta > 0
                          ? `+${formatVND(option.priceDelta)}`
                          : "Miễn phí"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <label className="grid gap-2 text-sm font-semibold text-foreground">
              Ghi chú cho món
              <textarea
                className="min-h-20 resize-y rounded-xl border border-border bg-card px-3 py-2 font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground"
                placeholder="Ví dụ: ít đá, ít ngọt..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <div className="flex items-center rounded-full border border-border">
                <button
                  className="size-10 rounded-full text-lg text-foreground hover:bg-background disabled:opacity-40"
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                  aria-label="Giảm số lượng"
                >
                  −
                </button>
                <span className="min-w-9 text-center text-sm font-semibold">
                  {quantity}
                </span>
                <button
                  className="size-10 rounded-full text-lg text-foreground hover:bg-background"
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                  disabled={quantity >= 99}
                  aria-label="Tăng số lượng"
                >
                  +
                </button>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Tạm tính</p>
                <p className="font-semibold text-primary">{formatVND(totalPrice)}</p>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary sm:w-auto"
                type="button"
                onClick={handleAdd}
                disabled={
                  !item.isAvailable ||
                  (sizeOptions.length > 0 && !selectedSize) ||
                  (iceOptions.length > 0 && !selectedIce) ||
                  (sugarOptions.length > 0 && !selectedSugar)
                }
              >
                {item.isAvailable ? "Thêm vào giỏ" : "Hết hàng"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
