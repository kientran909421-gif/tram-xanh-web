"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Coffee01Icon } from "@hugeicons/core-free-icons";
import { formatVND } from "@/lib/utils";

type MenuCardProps = {
  item: {
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    isAvailable: boolean;
  };
  onClick?: () => void;
};

export function MenuCard({ item, onClick }: MenuCardProps) {
  const content = (
    <>
      {item.imageUrl ? (
        <div
          className="aspect-[4/3] bg-cover bg-center"
          role="img"
          aria-label={item.name}
          style={{ backgroundImage: `url(${JSON.stringify(item.imageUrl)})` }}
        />
      ) : (
        <div
          className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-accent via-accent to-ring text-primary"
          role="img"
          aria-label={`Ảnh minh họa ${item.name}`}
        >
          <HugeiconsIcon icon={Coffee01Icon} size={64} aria-hidden="true" />
        </div>
      )}
      <div className="flex min-h-32 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground">{item.name}</h3>
          {!item.isAvailable ? (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Hết hàng
            </span>
          ) : null}
        </div>
        {item.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <p className="mt-auto pt-4 font-semibold text-primary">
          {formatVND(item.price)}
        </p>
      </div>
    </>
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {onClick ? (
        <button
          className="block w-full cursor-pointer text-left"
          type="button"
          onClick={onClick}
          aria-haspopup="dialog"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </article>
  );
}
