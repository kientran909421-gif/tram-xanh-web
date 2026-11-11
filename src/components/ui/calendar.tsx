"use client";

import { useMemo, useState } from "react";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function Calendar({
  selected,
  minDate,
  maxDate,
  onSelect,
}: {
  selected: string;
  minDate: string;
  maxDate: string;
  onSelect: (date: string) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selected));
  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const selectedLabel = formatMonth(visibleMonth);
  const canGoBack = monthKey(visibleMonth) > monthKey(startOfMonth(minDate));
  const canGoForward =
    monthKey(visibleMonth) < monthKey(startOfMonth(maxDate));

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          aria-label="Tháng trước"
          className="grid size-9 place-items-center rounded-lg text-lg text-primary hover:bg-muted disabled:opacity-30"
          disabled={!canGoBack}
          onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
          type="button"
        >
          ‹
        </button>
        <p aria-live="polite" className="font-semibold text-foreground">
          {selectedLabel}
        </p>
        <button
          aria-label="Tháng sau"
          className="grid size-9 place-items-center rounded-lg text-lg text-primary hover:bg-muted disabled:opacity-30"
          disabled={!canGoForward}
          onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
          type="button"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div className="py-2 font-medium" key={day}>
            {day}
          </div>
        ))}
        {days.map((day) => {
          const date = toDateString(day);
          const disabled = date < minDate || date > maxDate;
          const isSelected = date === selected;

          return (
            <button
              aria-pressed={isSelected}
              className={`aspect-square rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground ${
                isSelected
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
              disabled={disabled}
              key={date}
              onClick={() => onSelect(date)}
              type="button"
            >
              {day.getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getCalendarDays(month: Date): Date[] {
  const firstDay = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1),
  );
  const offset = (firstDay.getUTCDay() + 6) % 7;
  const start = new Date(firstDay.getTime() - offset * 86_400_000);
  return Array.from({ length: 42 }, (_, index) =>
    new Date(start.getTime() + index * 86_400_000),
  );
}

function startOfMonth(date: string): Date {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
}

function addMonths(month: Date, count: number): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + count, 1));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMonth(month: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(month);
}

function monthKey(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}
