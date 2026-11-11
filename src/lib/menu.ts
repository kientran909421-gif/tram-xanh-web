import { Prisma } from "@prisma/client";

export const menuItemSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  imageUrl: true,
  isAvailable: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  options: {
    where: { isAvailable: true },
    orderBy: [{ group: "asc" }, { name: "asc" }],
    select: {
      id: true,
      group: true,
      name: true,
      priceDelta: true,
    },
  },
} satisfies Prisma.MenuItemSelect;

export type MenuItemWithOptions = Prisma.MenuItemGetPayload<{
  select: typeof menuItemSelect;
}>;
