import { z } from "zod";

export const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SERVED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });

export const orderManagementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  status: z.enum(orderStatuses).optional(),
  q: z.string().trim().max(100).optional(),
  type: z.enum(["TAKEAWAY", "DELIVERY"]).optional(),
  employeeId: z.string().trim().min(1).max(100).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "Khoảng ngày không hợp lệ",
  path: ["to"],
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
  z
    .object({
      action: z.literal("STATUS"),
      status: z.enum(orderStatuses),
      note: z.string().trim().max(500).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("REFUND"),
      amount: z.number().int().positive().max(1_000_000_000).optional(),
      note: z.string().trim().max(500).optional(),
    })
    .strict(),
]);

export const customerOrderActionSchema = z
  .object({ action: z.literal("CANCEL") })
  .strict();

export const orderStatusChangeSchema = z
  .object({
    status: z.enum(orderStatuses),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const orderCancelSchema = z
  .object({ note: z.string().trim().max(500).optional() })
  .strict();

export const orderPaymentSchema = z
  .object({
    amountTendered: z.number().int().min(0).max(1_000_000_000).optional(),
  })
  .strict();

export const orderRefundSchema = z
  .object({
    amount: z.number().int().positive().max(1_000_000_000).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const cancellationRequestSchema = z
  .object({ reason: z.string().trim().max(500).optional() })
  .strict();

export const cancellationReviewSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    note: z.string().trim().max(500).optional(),
  })
  .strict();
