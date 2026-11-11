"use client";

import Image from "next/image";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Coffee01Icon } from "@hugeicons/core-free-icons";
import { Dialog } from "@base-ui/react/dialog";
import type { MenuItemWithOptions } from "@/lib/menu";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type MenuOption = MenuItemWithOptions["options"][number];

export type MenuSelection = {
  size: MenuOption | null;
  toppings: MenuOption[];
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
  const toppingOptions = item.options.filter(
    (option) => option.group === "TOPPING",
  );
  const [selectedSizeId, setSelectedSizeId] = useState(
    sizeOptions[0]?.id ?? "",
  );
  const [selectedToppingIds, setSelectedToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const selectedSize =
    sizeOptions.find((option) => option.id === selectedSizeId) ?? null;
  const selectedToppings = toppingOptions.filter((option) =>
    selectedToppingIds.includes(option.id),
  );
  const unitPrice =
    item.price +
    (selectedSize?.priceDelta ?? 0) +
    selectedToppings.reduce((total, option) => total + option.priceDelta, 0);
  const totalPrice = unitPrice * quantity;

  function toggleTopping(option: MenuOption) {
    setSelectedToppingIds((current) =>
      current.includes(option.id)
        ? current.filter((id) => id !== option.id)
        : [...current, option.id],
    );
  }

  function handleAdd() {
    if (!item || !item.isAvailable || (sizeOptions.length > 0 && !selectedSize)) {
      return;
    }

    onAdd(item, {
      size: selectedSize,
      toppings: selectedToppings,
      quantity,
      note: note.trim(),
      unitPrice,
      totalPrice,
    });
    onOpenChange(false);
  }

  const hasSizeOptions = sizeOptions.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-950/55 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl bg-[#fffdf9] shadow-2xl outline-none">
          <div className="relative aspect-[16/8] shrink-0 overflow-hidden bg-gradient-to-br from-[#efe3d2] via-[#dfc6a9] to-[#c6a27e]">
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
              <div className="flex h-full items-center justify-center text-[#714d34]">
                <HugeiconsIcon icon={Coffee01Icon} size={76} aria-hidden="true" />
              </div>
            )}
            <Dialog.Close
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-3 top-3 rounded-full bg-white/90"
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
                  <Dialog.Title className="text-2xl font-semibold text-[#3f2d22]">
                    {item.name}
                  </Dialog.Title>
                  <p className="mt-1 font-semibold text-[#754c32]">
                    {formatVND(item.price)}
                  </p>
                </div>
                {!item.isAvailable ? (
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-600">
                    Hết hàng
                  </span>
                ) : null}
              </div>
              {item.description ? (
                <Dialog.Description className="mt-3 text-sm leading-6 text-stone-600">
                  {item.description}
                </Dialog.Description>
              ) : null}
            </div>

            {hasSizeOptions ? (
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-[#3f2d22]">
                  Kích cỡ <span className="font-normal text-stone-500">· Chọn 1</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sizeOptions.map((option) => (
                    <label
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#e9e0d2] px-4 py-3 has-[:checked]:border-[#754c32] has-[:checked]:bg-[#f8f4ed]"
                      key={option.id}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`size-${item.id}`}
                          value={option.id}
                          checked={selectedSizeId === option.id}
                          onChange={() => setSelectedSizeId(option.id)}
                          className="accent-[#68452f]"
                        />
                        <span className="text-sm font-medium text-stone-800">
                          {option.name}
                        </span>
                      </span>
                      <span className="text-sm text-stone-600">
                        {option.priceDelta > 0
                          ? `+${formatVND(option.priceDelta)}`
                          : "Không phụ thu"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {toppingOptions.length > 0 ? (
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-[#3f2d22]">
                  Topping <span className="font-normal text-stone-500">· Tùy chọn</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {toppingOptions.map((option) => (
                    <label
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#e9e0d2] px-4 py-3 has-[:checked]:border-[#754c32] has-[:checked]:bg-[#f8f4ed]"
                      key={option.id}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedToppingIds.includes(option.id)}
                          onChange={() => toggleTopping(option)}
                          className="size-4 accent-[#68452f]"
                        />
                        <span className="text-sm font-medium text-stone-800">
                          {option.name}
                        </span>
                      </span>
                      <span className="text-sm text-stone-600">
                        {option.priceDelta > 0
                          ? `+${formatVND(option.priceDelta)}`
                          : "Miễn phí"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <label className="grid gap-2 text-sm font-semibold text-[#3f2d22]">
              Ghi chú cho món
              <textarea
                className="min-h-20 resize-y rounded-xl border border-[#e9e0d2] bg-white px-3 py-2 font-normal text-stone-800 outline-none focus-visible:ring-2 focus-visible:ring-[#a78361]"
                placeholder="Ví dụ: ít đá, ít ngọt..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e9e0d2] pt-5">
              <div className="flex items-center rounded-full border border-[#e9e0d2]">
                <button
                  className="size-10 rounded-full text-lg text-stone-700 hover:bg-[#f8f4ed] disabled:opacity-40"
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
                  className="size-10 rounded-full text-lg text-stone-700 hover:bg-[#f8f4ed]"
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                  disabled={quantity >= 99}
                  aria-label="Tăng số lượng"
                >
                  +
                </button>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-stone-500">Tạm tính</p>
                <p className="font-semibold text-[#513625]">{formatVND(totalPrice)}</p>
              </div>
              <Button
                className="w-full bg-[#68452f] text-white hover:bg-[#513625] sm:w-auto"
                type="button"
                onClick={handleAdd}
                disabled={
                  !item.isAvailable ||
                  (sizeOptions.length > 0 && !selectedSize)
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
