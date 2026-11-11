import { z } from "zod";

export const vietnamPhoneSchema = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0");
