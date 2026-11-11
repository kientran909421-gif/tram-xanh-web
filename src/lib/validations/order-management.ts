import { z } from "zod";

export const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERING",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const orderManagementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  status: z.enum(orderStatuses).optional(),
  q: z.string().trim().max(100).optional(),
});

export const orderStaffActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("ASSIGN"),
      assignedCashierId: z.string().min(1).nullable().optional(),
      assignedBaristaId: z.string().min(1).nullable().optional(),
    })
    .strict()
    .refine(
      (value) =>
        value.assignedCashierId !== undefined ||
        value.assignedBaristaId !== undefined,
      { message: "Vui lòng cung cấp người được phân công" },
    ),
  z
    .object({
      action: z.literal("CONFIRM_PAYMENT"),
      amountTendered: z.number().int().min(0).max(1_000_000_000).optional(),
    })
    .strict(),
  z.object({ action: z.literal("STATUS"), status: z.enum(orderStatuses) }).strict(),
  z.object({ action: z.literal("REFUND") }).strict(),
]);

export const customerOrderActionSchema = z
  .object({ action: z.literal("CANCEL") })
  .strict();
