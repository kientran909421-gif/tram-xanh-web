import { z } from "zod";

const openingTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

export const updateStoreSettingsSchema = z
  .object({
    storeName: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    phone: z.string().trim().min(7).max(30).optional(),
    email: z.string().trim().email().max(254).optional(),
    openingTime: openingTime.optional(),
    closingTime: openingTime.optional(),
    deliveryFee: z.number().int().min(0).max(1_000_000).optional(),
    customerCancelMinutes: z.number().int().min(0).max(1440).optional(),
    allowCash: z.boolean().optional(),
    allowBankTransfer: z.boolean().optional(),
    allowMomo: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Vui lòng cung cấp thông tin cần cập nhật",
  });
