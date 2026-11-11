import { z } from "zod";

const quantitySchema = z
  .number()
  .finite()
  .min(-1_000_000_000)
  .max(1_000_000_000)
  .refine((value) => Math.round(value * 1000) === value * 1000, {
    message: "Số lượng tối đa 3 chữ số thập phân",
  });
const nonnegativeQuantitySchema = quantitySchema.refine(
  (value) => value >= 0,
  { message: "Số lượng không được âm" },
);

export const ingredientQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  lowStock: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});

export const createIngredientSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    unit: z.string().trim().min(1).max(32),
    initialQuantity: nonnegativeQuantitySchema.default(0),
    lowStockAt: nonnegativeQuantitySchema.default(0),
  })
  .strict();

export const updateIngredientSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    unit: z.string().trim().min(1).max(32).optional(),
    lowStockAt: nonnegativeQuantitySchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Vui lòng cung cấp thông tin cần cập nhật",
  });

export const inventoryMovementSchema = z
  .object({
    ingredientId: z.string().trim().min(1),
    type: z.enum(["RECEIPT", "ADJUSTMENT", "WASTE"]),
    quantity: quantitySchema,
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine(({ type, quantity }, context) => {
    if (type !== "ADJUSTMENT" && quantity <= 0) {
      context.addIssue({
        code: "custom",
        message: "Số lượng nhập/hủy phải lớn hơn 0",
        path: ["quantity"],
      });
    } else if (type === "ADJUSTMENT" && quantity === 0) {
      context.addIssue({
        code: "custom",
        message: "Số lượng điều chỉnh không được bằng 0",
        path: ["quantity"],
      });
    }
  });

export const createInventoryAlertSchema = z
  .object({
    ingredientId: z.string().trim().min(1).optional(),
    message: z.string().trim().min(1).max(500),
  })
  .strict();

export const updateInventoryAlertSchema = z
  .object({
    status: z.enum(["RESOLVED", "DISMISSED"]),
  })
  .strict();
