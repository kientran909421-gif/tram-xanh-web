import { z } from "zod";

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
  available: z.enum(["true", "false"]).optional(),
});
