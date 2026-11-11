import { z } from "zod";
import { isMenuImageUrl } from "@/lib/menu-image";

export const menuQuerySchema = z.object({
  category: z
    .string()
    .trim()
    .max(100, "Danh mục không hợp lệ")
    .optional()
    .or(z.literal("")),
  q: z
    .string()
    .trim()
    .max(100, "Từ khóa không được vượt quá 100 ký tự")
    .optional()
    .or(z.literal("")),
  minPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
}).refine(
  (value) =>
    value.minPrice === undefined ||
    value.maxPrice === undefined ||
    value.minPrice <= value.maxPrice,
  {
    message: "Giá tối thiểu không được lớn hơn giá tối đa",
    path: ["maxPrice"],
  },
);

export function slugifyMenuName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const nameSchema = z.string().trim().min(1).max(120);
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch nối");
const imageUrlSchema = z
  .string()
  .url("URL ảnh không hợp lệ")
  .refine(isMenuImageUrl, "Ảnh phải thuộc bucket Supabase của dự án");

const menuOptionSchema = z
  .object({
    id: z.string().min(1).optional(),
    group: z.enum(["SIZE", "ICE", "SUGAR", "TOPPING"]),
    name: z.string().trim().min(1).max(80),
    priceDelta: z.number().int(),
    isAvailable: z.boolean(),
  })
  .strict();

const menuFields = {
  name: nameSchema,
  slug: slugSchema.optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  price: z.number().int().min(0).max(10_000_000),
  categoryId: z.string().trim().min(1),
  imageUrl: imageUrlSchema.nullable().optional(),
  isAvailable: z.boolean(),
  options: z.array(menuOptionSchema).max(100),
};

export const createMenuSchema = z
  .object(menuFields)
  .strict()
  .superRefine((menu, context) => {
    if (!menu.slug && !slugifyMenuName(menu.name)) {
      context.addIssue({
        code: "custom",
        path: ["name"],
        message: "Không thể tạo slug từ tên món",
      });
    }
    menu.options.forEach((option, index) => {
      if (option.priceDelta < -menu.price) {
        context.addIssue({
          code: "custom",
          path: ["options", index, "priceDelta"],
          message: "Chênh lệch giá không được thấp hơn giá món",
        });
      }
    });
  });

export const updateMenuSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    price: z.number().int().min(0).max(10_000_000).optional(),
    categoryId: z.string().trim().min(1).optional(),
    imageUrl: imageUrlSchema.nullable().optional(),
    isAvailable: z.boolean().optional(),
    options: z.array(menuOptionSchema).max(100).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Vui lòng cung cấp thông tin cần cập nhật",
  });

export const adminMenuQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  q: z.string().trim().max(120).default(""),
  category: z.string().trim().max(120).default(""),
});

export type MenuFormValues = z.infer<typeof createMenuSchema>;
