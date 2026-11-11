import { z } from "zod";
import { authRoles } from "@/lib/auth.config";
import { vietnamPhoneSchema } from "@/lib/validations/common";

const userFields = {
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: vietnamPhoneSchema.nullable().optional(),
  role: z.enum(authRoles),
  isActive: z.boolean(),
};

export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  q: z.string().trim().max(100).optional(),
  role: z.enum(authRoles).optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});

export const createManagedUserSchema = z
  .object({
    ...userFields,
    password: z.string().min(12).max(128),
  })
  .strict();

export const updateManagedUserSchema = z
  .object({
    name: userFields.name.optional(),
    email: userFields.email.optional(),
    phone: userFields.phone,
    role: userFields.role.optional(),
    isActive: userFields.isActive.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Vui lòng cung cấp thông tin cần cập nhật",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128),
  })
  .strict();
