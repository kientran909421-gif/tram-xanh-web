import { z } from "zod";

export const promotionValidationSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã giảm giá").max(50),
  subtotal: z.number().int().nonnegative().safe(),
});
