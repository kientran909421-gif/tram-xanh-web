import { describe, expect, it } from "vitest";
import {
  buildReservationSlots,
  getHoChiMinhDate,
  getRemainingSlotCapacity,
  getReservationSlotsForDate,
  reservationDateToUtc,
} from "./reservation-slots";

describe("reservation slot helpers", () => {
  it("generates every 30-minute slot from opening through the last booking", () => {
    const slots = getReservationSlotsForDate();

    expect(slots).toHaveLength(30);
    expect(slots[0]).toBe("07:00");
    expect(slots[1]).toBe("07:30");
    expect(slots.at(-1)).toBe("21:30");
  });

  it("calculates remaining capacity and availability from reserved guests", () => {
    const slots = buildReservationSlots(
      "2026-05-10",
      4,
      new Map([["10:00", 26], ["10:30", 27]]),
      new Date("2026-05-09T00:00:00.000Z"),
      30,
    );

    expect(getRemainingSlotCapacity(30, 26)).toBe(4);
    expect(getRemainingSlotCapacity(30, 35)).toBe(-5);
    expect(slots.find((slot) => slot.time === "10:00")).toEqual({
      time: "10:00",
      remaining: 4,
      available: true,
    });
    expect(slots.find((slot) => slot.time === "10:30")).toEqual({
      time: "10:30",
      remaining: 3,
      available: false,
    });
  });

  it("uses Ho Chi Minh local date and disables passed or too-soon slots today", () => {
    const now = new Date("2026-05-10T02:00:30.000Z");
    const slots = buildReservationSlots(
      "2026-05-10",
      1,
      new Map(),
      now,
      30,
    );

    expect(getHoChiMinhDate(now)).toBe("2026-05-10");
    expect(slots.find((slot) => slot.time === "09:30")?.available).toBe(false);
    expect(slots.find((slot) => slot.time === "10:00")?.available).toBe(false);
    expect(slots.find((slot) => slot.time === "10:30")?.available).toBe(true);
    expect(
      buildReservationSlots(
        "2026-05-09",
        1,
        new Map(),
        now,
        30,
      ).every((slot) => !slot.available),
    ).toBe(true);
  });

  it("stores the selected calendar date at midnight UTC", () => {
    expect(reservationDateToUtc("2026-05-10").toISOString()).toBe(
      "2026-05-10T00:00:00.000Z",
    );
  });
});
