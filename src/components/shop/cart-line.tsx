"use client";

import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Coffee01Icon } from "@hugeicons/core-free-icons";
import type { CartItem } from "@/stores/cart";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";

export function CartLine({ item }: { item: CartItem }) {
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const updateNote = useCartStore((state) => state.updateNote);

  return (
    <article className="grid gap-4 border-b border-[#e9e0d2] py-5 sm:grid-cols-[5rem_1fr]">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#efe3d2] to-[#c6a27e] text-[#714d34]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <HugeiconsIcon icon={Coffee01Icon} size={36} aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-[#3f2d22]">{item.name}</h3>
            <p className="mt-1 text-sm font-medium text-[#754c32]">
              {formatVND(item.unitPrice)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={() => removeItem(item.key)}
            aria-label={`Xóa ${item.name} khỏi giỏ`}
          >
            Xóa
          </Button>
        </div>
        {item.options.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {item.options.map((option) => (
              <li
                className="rounded-full bg-[#f3ede4] px-2.5 py-1 text-xs text-stone-700"
                key={option.id}
              >
                {option.name}
                {option.priceDelta > 0
                  ? ` (+${formatVND(option.priceDelta)})`
                  : ""}
              </li>
            ))}
          </ul>
        ) : null}
        <label className="mt-3 grid gap-1.5 text-xs font-medium text-stone-600">
          Ghi chú
          <input
            className="h-9 rounded-lg border border-[#e2d5c4] bg-white px-3 text-sm text-stone-800 outline-none focus-visible:ring-2 focus-visible:ring-[#a78361]"
            value={item.note}
            onChange={(event) => updateNote(item.key, event.target.value)}
            placeholder="Thêm ghi chú"
            maxLength={300}
          />
        </label>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center rounded-full border border-[#e2d5c4]">
            <button
              className="size-9 rounded-full text-lg hover:bg-[#f8f4ed] disabled:opacity-40"
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity - 1)}
              disabled={item.quantity <= 1}
              aria-label={`Giảm số lượng ${item.name}`}
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm font-semibold">
              {item.quantity}
            </span>
            <button
              className="size-9 rounded-full text-lg hover:bg-[#f8f4ed] disabled:opacity-40"
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity + 1)}
              disabled={item.quantity >= 99}
              aria-label={`Tăng số lượng ${item.name}`}
            >
              +
            </button>
          </div>
          <p className="text-sm font-semibold text-[#513625]">
            {formatVND(item.unitPrice * item.quantity)}
          </p>
        </div>
      </div>
    </article>
  );
}
