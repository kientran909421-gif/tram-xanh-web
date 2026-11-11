import { z } from "zod";
import { vietnamPhoneSchema } from "@/lib/validations/common";

const orderItemSchema = z
  .object({
    menuItemId: z.string().trim().min(1),
    optionIds: z.array(z.string().trim().min(1)),
    quantity: z.number().int().min(1).max(99),
    note: z.string().max(200).optional(),
  })
  .strict()
  .superRefine((item, context) => {
    if (new Set(item.optionIds).size !== item.optionIds.length) {
      context.addIssue({
        code: "custom",
        message: "Tùy chọn món không được lặp lại",
        path: ["optionIds"],
      });
    }
  });

const orderDetailsShape = {
  type: z.enum(["TAKEAWAY", "DELIVERY"]),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: vietnamPhoneSchema,
  address: z.string().trim().max(500).optional(),
  note: z.string().max(1000).optional(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "MOMO"]),
  promoCode: z.string().trim().min(1).max(50).optional(),
};

function validateDeliveryAddress(
  order: { type: "TAKEAWAY" | "DELIVERY"; address?: string },
  context: z.RefinementCtx,
) {
  if (order.type === "DELIVERY" && !order.address?.trim()) {
    context.addIssue({
      code: "custom",
      message: "Vui lòng nhập địa chỉ giao hàng",
      path: ["address"],
    });
  }
}

export const createOrderSchema = z
  .object({
    ...orderDetailsShape,
    items: z.array(orderItemSchema).min(1).max(50),
  })
  .strict()
  .superRefine(validateDeliveryAddress);

export const orderDetailsSchema = z
  .object(orderDetailsShape)
  .strict()
  .superRefine(validateDeliveryAddress);

export const trackOrderQuerySchema = z.object({
  code: z.string().trim().min(1).max(32),
  phone: vietnamPhoneSchema,
});

export const myOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
