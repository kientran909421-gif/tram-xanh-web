"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useCartStore } from "@/stores/cart";

export function ClearCart() {
  const clear = useCartStore((state) => state.clear);

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      clear();
      return;
    }
    return useCartStore.persist.onFinishHydration(() => clear());
  }, [clear]);

  return null;
}

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      <HugeiconsIcon
        icon={copied ? Tick02Icon : Copy01Icon}
        size={16}
        aria-hidden="true"
      />
      {copied ? "Đã sao chép" : "Sao chép mã đơn"}
    </button>
  );
}