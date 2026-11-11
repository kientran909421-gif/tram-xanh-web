"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartOption = {
  id: string;
  group: "SIZE" | "TOPPING";
  name: string;
  priceDelta: number;
};

export type CartItem = {
  key: string;
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  options: CartOption[];
  note: string;
};

type NewCartItem = Omit<CartItem, "key">;

const serverStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

type CartState = {
  items: CartItem[];
  hasHydrated: boolean;
  addItem: (item: NewCartItem) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  updateNote: (key: string, note: string) => void;
  clear: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export function createCartItemKey(
  menuItemId: string,
  options: readonly Pick<CartOption, "id">[],
): string {
  const optionIds = options.map((option) => option.id).sort();
  return JSON.stringify([menuItemId, optionIds]);
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.min(99, Math.max(1, Math.trunc(quantity)));
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      addItem: (item) => {
        const key = createCartItemKey(item.menuItemId, item.options);
        const quantity = clampQuantity(item.quantity);
        set((state) => {
          const existingItem = state.items.find((line) => line.key === key);
          if (existingItem) {
            return {
              items: state.items.map((line) =>
                line.key === key
                  ? { ...line, quantity: clampQuantity(line.quantity + quantity) }
                  : line,
              ),
            };
          }

          return {
            items: [...state.items, { ...item, key, quantity }],
          };
        });
      },
      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((item) => item.key !== key),
        })),
      updateQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.key === key
              ? { ...item, quantity: clampQuantity(quantity) }
              : item,
          ),
        })),
      updateNote: (key, note) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.key === key ? { ...item, note } : item,
          ),
        })),
      clear: () => set({ items: [] }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "cafe-cart",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? serverStorage : window.localStorage,
      ),
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
