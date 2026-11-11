import {
  RESERVATION_LAST_SLOT,
  RESERVATION_MIN_ADVANCE_MINUTES,
  RESERVATION_OPENING_TIME,
  RESERVATION_SLOT_STEP_MINUTES,
  RESERVATION_TIME_ZONE,
  getReservationSlotCapacity,
} from "../lib/site";

export type ReservationSlot = {
  time: string;
  remaining: number;
  available: boolean;
};

export function getHoChiMinhDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESERVATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getReservationSlotsForDate(): string[] {
  const openingMinutes = toMinutes(RESERVATION_OPENING_TIME);
  const lastMinutes = toMinutes(RESERVATION_LAST_SLOT);
  const slots: string[] = [];

  for (
    let minutes = openingMinutes;
    minutes <= lastMinutes;
    minutes += RESERVATION_SLOT_STEP_MINUTES
  ) {
    slots.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }

  return slots;
}

export function getRemainingSlotCapacity(
  capacity: number,
  reservedGuests: number,
): number {
  return capacity - reservedGuests;
}

export function buildReservationSlots(
  date: string,
  guests: number,
  reservedGuestsBySlot: ReadonlyMap<string, number>,
  now = new Date(),
  capacity = getReservationSlotCapacity(),
): ReservationSlot[] {
  const today = getHoChiMinhDate(now);
  const isPastDate = date < today;

  return getReservationSlotsForDate().map((time) => {
    const remaining = getRemainingSlotCapacity(
      capacity,
      reservedGuestsBySlot.get(time) ?? 0,
    );
    const bookingTime = reservationSlotInstant(date, time);
    const hasEnoughAdvanceNotice =
      bookingTime.getTime() >=
      now.getTime() + RESERVATION_MIN_ADVANCE_MINUTES * 60_000;

    return {
      time,
      remaining,
      available:
        !isPastDate && remaining >= guests && hasEnoughAdvanceNotice,
    };
  });
}

export function reservationDateToUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function reservationSlotInstant(date: string, time: string): Date {
  return new Date(
    reservationDateToUtc(date).getTime() +
      toMinutes(time) * 60_000 -
      7 * 60 * 60_000,
  );
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
