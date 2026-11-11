import { Prisma, ReservationStatus } from "@prisma/client";
import {
  RESERVATION_MIN_ADVANCE_MINUTES,
  getReservationSlotCapacity,
} from "@/lib/site";
import { generateReservationCode } from "@/lib/order-code";
import { prisma } from "@/lib/prisma";
import type { ReservationInput } from "@/lib/validations/reservation";
import {
  buildReservationSlots,
  getHoChiMinhDate,
  getReservationSlotsForDate,
  getRemainingSlotCapacity,
  reservationDateToUtc,
  reservationSlotInstant,
  type ReservationSlot,
} from "./reservation-slots";

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.APPROVED,
];

export { buildReservationSlots, getHoChiMinhDate, getReservationSlotsForDate };
export type { ReservationSlot } from "./reservation-slots";

export class ReservationError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ReservationError";
  }
}

export async function getSlots(
  date: string,
  guests: number,
): Promise<ReservationSlot[]> {
  validateDateNotPast(date);
  const reservations = await prisma.reservation.findMany({
    where: {
      date: reservationDateToUtc(date),
      status: { in: ACTIVE_RESERVATION_STATUSES },
    },
    select: { timeSlot: true, guests: true },
  });
  const reservedGuestsBySlot = new Map<string, number>();

  for (const reservation of reservations) {
    reservedGuestsBySlot.set(
      reservation.timeSlot,
      (reservedGuestsBySlot.get(reservation.timeSlot) ?? 0) +
        reservation.guests,
    );
  }

  return buildReservationSlots(date, guests, reservedGuestsBySlot);
}

export async function createReservation(
  input: ReservationInput,
  userId?: string,
): Promise<{ code: string }> {
  validateDateNotPast(input.date);
  if (!getReservationSlotsForDate().includes(input.timeSlot)) {
    throw new ReservationError(400, "Khung giờ đặt bàn không hợp lệ");
  }

  for (let attempt = 0; attempt <= 5; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          validateDateNotPast(input.date);
          const existingReservations =
            await transaction.reservation.findMany({
              where: {
                date: reservationDateToUtc(input.date),
                timeSlot: input.timeSlot,
                status: { in: ACTIVE_RESERVATION_STATUSES },
              },
              select: { guests: true },
            });
          const reservedGuests = existingReservations.reduce(
            (total, reservation) => total + reservation.guests,
            0,
          );
          const remaining = getRemainingSlotCapacity(
            getReservationSlotCapacity(),
            reservedGuests,
          );
          if (remaining < input.guests) {
            throw new ReservationError(
              409,
              "Khung giờ vừa hết chỗ. Vui lòng chọn giờ khác",
            );
          }

          const now = new Date();
          const slotInstant = reservationSlotInstant(input.date, input.timeSlot);
          if (
            slotInstant.getTime() <
            now.getTime() + RESERVATION_MIN_ADVANCE_MINUTES * 60_000
          ) {
            throw new ReservationError(
              400,
              "Vui lòng chọn khung giờ cách hiện tại ít nhất 60 phút",
            );
          }

          const code = generateReservationCode(reservationDateToUtc(input.date));
          await transaction.reservation.create({
            data: {
              code,
              userId,
              name: input.name,
              phone: input.phone,
              date: reservationDateToUtc(input.date),
              timeSlot: input.timeSlot,
              guests: input.guests,
              note: input.note || null,
            },
            select: { id: true },
          });
          return { code };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof ReservationError) {
        throw error;
      }
      if (isRetryableReservationConflict(error) && attempt < 5) {
        continue;
      }
      if (isRetryableReservationConflict(error)) {
        throw new ReservationError(
          409,
          "Không thể hoàn tất đặt bàn lúc này. Vui lòng thử lại",
        );
      }
      throw error;
    }
  }

  throw new ReservationError(409, "Không thể hoàn tất đặt bàn lúc này");
}

function validateDateNotPast(date: string): void {
  if (!isValidDateString(date)) {
    throw new ReservationError(400, "Ngày đặt bàn không hợp lệ");
  }
  if (date < getHoChiMinhDate()) {
    throw new ReservationError(400, "Không thể đặt bàn vào ngày đã qua");
  }
}

function isValidDateString(date: string): boolean {
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date
  );
}

function isRetryableReservationConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  return (
    error.code === "P2034" ||
    (error.code === "P2002" &&
      (Array.isArray(error.meta?.target)
        ? error.meta.target.includes("code")
        : String(error.meta?.target).includes("code")))
  );
}
