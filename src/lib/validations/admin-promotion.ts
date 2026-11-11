import { z } from "zod";

const promotionFields = {
  code: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  description: z.string().trim().max(500).nullable().optional(),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().positive().max(100_000_000),
  minOrder: z.number().int().min(0).max(1_000_000_000),
  maxDiscount: z.number().int().positive().max(1_000_000_000).nullable(),
  startsAt: z.string().datetime().transform((value) => new Date(value)),
  expiresAt: z.string().datetime().transform((value) => new Date(value)),
  usageLimit: z.number().int().positive().nullable(),
  isActive: z.boolean(),
};

export const createPromotionSchema = z
  .object(promotionFields)
  .strict()
  .refine((value) => value.expiresAt > value.startsAt, {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
    path: ["expiresAt"],
  })
  .refine(
    (value) => value.type !== "PERCENT" || value.value <= 100,
    {
      message: "Phần trăm giảm không được vượt quá 100%",
      path: ["value"],
    },
  );

export const updatePromotionSchema = z
  .object({
    code: promotionFields.code.optional(),
    description: promotionFields.description,
    type: promotionFields.type.optional(),
    value: promotionFields.value.optional(),
    minOrder: promotionFields.minOrder.optional(),
    maxDiscount: promotionFields.maxDiscount,
    startsAt: promotionFields.startsAt.optional(),
    expiresAt: promotionFields.expiresAt.optional(),
    usageLimit: promotionFields.usageLimit,
    isActive: promotionFields.isActive.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Vui lòng cung cấp thông tin cần cập nhật",
  });
