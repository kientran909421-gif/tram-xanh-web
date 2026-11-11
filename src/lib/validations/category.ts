import { z } from "zod";

export function slugifyCategoryName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const nameSchema = z.string().trim().min(1).max(60);
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch nối");

export const createCategorySchema = z
  .object({
    name: nameSchema,
    slug: slugSchema.optional(),
    sortOrder: z.number().int().default(0),
  })
  .strict()
  .transform((value) => ({
    ...value,
    slug: value.slug ?? slugifyCategoryName(value.name),
  }))
  .refine((value) => value.slug.length > 0, {
    message: "Không thể tạo slug từ tên danh mục",
    path: ["name"],
  });

export const updateCategorySchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    sortOrder: z.number().int().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.slug !== undefined ||
      value.sortOrder !== undefined,
    { message: "Vui lòng cung cấp thông tin cần cập nhật" },
  );
