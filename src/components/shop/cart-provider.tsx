"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { useCartStore } from "@/stores/cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let active = true;

    void Promise.resolve(useCartStore.persist.rehydrate())
      .catch((error: unknown) => {
        console.error("Failed to hydrate the persisted cart:", error);
      })
      .finally(() => {
        if (active) {
          useCartStore.getState().setHasHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {children}
      <Toaster position="top-center" richColors />
    </>
  );
}
