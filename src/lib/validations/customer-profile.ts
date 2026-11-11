import { z } from "zod";
import { vietnamPhoneSchema } from "@/lib/validations/common";

export const updateCustomerProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: vietnamPhoneSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Vui lòng cung cấp thông tin cần cập nhật",
  });

export const createAddressSchema = z
  .object({
    label: z.string().trim().min(1).max(60),
    address: z.string().trim().min(5).max(500),
    isDefault: z.boolean().default(false),
  })
  .strict();

export const updateAddressSchema = z
  .object({
    label: z.string().trim().min(1).max(60).optional(),
    address: z.string().trim().min(5).max(500).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Vui lòng cung cấp thông tin cần cập nhật",
  });

export const createReviewSchema = z
  .object({
    orderItemId: z.string().trim().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();
