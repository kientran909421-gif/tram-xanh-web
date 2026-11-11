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
};

export function MenuCard({ item }: MenuCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#e9e0d2] bg-white shadow-sm">
      {item.imageUrl ? (
        <div
          className="aspect-[4/3] bg-cover bg-center"
          role="img"
          aria-label={item.name}
          style={{ backgroundImage: `url(${JSON.stringify(item.imageUrl)})` }}
        />
      ) : (
        <div
          className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#efe3d2] via-[#dfc6a9] to-[#c6a27e] text-[#714d34]"
          role="img"
          aria-label={`Ảnh minh họa ${item.name}`}
        >
          <HugeiconsIcon icon={Coffee01Icon} size={64} aria-hidden="true" />
        </div>
      )}
      <div className="flex min-h-32 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-[#3f2d22]">{item.name}</h3>
          {!item.isAvailable ? (
            <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
              Hết hàng
            </span>
          ) : null}
        </div>
        {item.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-stone-600">
            {item.description}
          </p>
        ) : null}
        <p className="mt-auto pt-4 font-semibold text-[#754c32]">
          {formatVND(item.price)}
        </p>
      </div>
    </article>
  );
}
