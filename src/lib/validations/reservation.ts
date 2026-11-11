import { z } from "zod";
import { vietnamPhoneSchema } from "@/lib/validations/common";
import {
  RESERVATION_LAST_SLOT,
  RESERVATION_OPENING_TIME,
  RESERVATION_SLOT_STEP_MINUTES,
} from "@/lib/site";

export const reservationDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")
  .refine((value) => {
    const parsedDate = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === value
    );
  }, "Ngày không hợp lệ");

export const reservationSchema = z
  .object({
    date: reservationDateSchema,
    timeSlot: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Khung giờ không hợp lệ"),
    guests: z.number().int().min(1).max(20),
    name: z.string().trim().min(1, "Vui lòng nhập họ tên").max(100),
    phone: vietnamPhoneSchema,
    note: z.string().trim().max(200).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const [hours, minutes] = value.timeSlot.split(":").map(Number);
    const slotMinutes = hours * 60 + minutes;
    const openingMinutes =
      Number(RESERVATION_OPENING_TIME.slice(0, 2)) * 60 +
      Number(RESERVATION_OPENING_TIME.slice(3));
    const lastMinutes =
      Number(RESERVATION_LAST_SLOT.slice(0, 2)) * 60 +
      Number(RESERVATION_LAST_SLOT.slice(3));

    if (
      slotMinutes < openingMinutes ||
      slotMinutes > lastMinutes ||
      (slotMinutes - openingMinutes) % RESERVATION_SLOT_STEP_MINUTES !== 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timeSlot"],
        message: "Khung giờ không hợp lệ",
      });
    }
  });

export const reservationSlotsQuerySchema = z.object({
  date: reservationDateSchema,
  guests: z.coerce.number().int().min(1).max(20),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
