"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  RESERVATION_MAX_ADVANCE_DAYS,
  RESERVATION_MIN_ADVANCE_MINUTES,
} from "@/lib/site";
import { reservationSchema } from "@/lib/validations/reservation";

type ReservationValues = z.infer<typeof reservationSchema>;
type Slot = { time: string; remaining: number; available: boolean };
type SlotsResult = { slots: Slot[] } | { error: string };

export function ReservationForm({
  initialDate,
  initialName,
  initialPhone,
}: {
  initialDate: string;
  initialName: string;
  initialPhone: string;
}) {
  const [date, setDate] = useState(initialDate);
  const [guests, setGuests] = useState(2);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadedSlotsQuery, setLoadedSlotsQuery] = useState("");
  const [reloadSlots, setReloadSlots] = useState(0);
  const [slotsError, setSlotsError] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successCode, setSuccessCode] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const form = useForm<ReservationValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      date: initialDate,
      timeSlot: "",
      guests: 2,
      name: initialName,
      phone: initialPhone,
      note: "",
    },
  });

  const maxDate = addDays(initialDate, RESERVATION_MAX_ADVANCE_DAYS);
  const slotsQuery = `${date}:${guests}:${reloadSlots}`;
  const loadingSlots = loadedSlotsQuery !== slotsQuery;

  useEffect(() => {
    const controller = new AbortController();

    fetch(
      `/api/reservations/slots?date=${encodeURIComponent(date)}&guests=${guests}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const result = (await response.json()) as SlotsResult;
        if (!response.ok || "error" in result) {
          throw new Error(
            "error" in result ? result.error : "Không thể tải khung giờ",
          );
        }
        setSlots(result.slots);
        setSlotsError("");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setSlotsError(error.message || "Không thể tải khung giờ đặt bàn");
          setSlots([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadedSlotsQuery(slotsQuery);
        }
      });

    return () => controller.abort();
  }, [date, guests, reloadSlots, slotsQuery]);

  function changeDate(nextDate: string) {
    setDate(nextDate);
    setSelectedTime("");
    setSlotsError("");
    form.setValue("date", nextDate, { shouldValidate: true });
    form.setValue("timeSlot", "");
  }

  function changeGuests(nextGuests: number) {
    const boundedGuests = Math.min(20, Math.max(1, nextGuests));
    setGuests(boundedGuests);
    setSelectedTime("");
    setSlotsError("");
    form.setValue("guests", boundedGuests, { shouldValidate: true });
    form.setValue("timeSlot", "");
  }

  async function onSubmit(values: ReservationValues) {
    setSubmitError("");
    setSuccessCode("");
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as { code?: string; error?: string };
      if (!response.ok || !result.code) {
        setSubmitError(result.error ?? "Không thể tạo đặt bàn lúc này");
        if (response.status === 409) {
          setSelectedTime("");
          form.setValue("timeSlot", "");
          const refreshed = await fetch(
            `/api/reservations/slots?date=${encodeURIComponent(date)}&guests=${guests}`,
          );
          const refreshedResult = (await refreshed.json()) as SlotsResult;
          if (refreshed.ok && "slots" in refreshedResult) {
            setSlots(refreshedResult.slots);
          }
        }
        return;
      }
      setSuccessCode(result.code);
    } catch {
      setSubmitError("Không thể kết nối máy chủ. Vui lòng thử lại");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(successCode);
      setCopyMessage("Đã sao chép mã đặt bàn");
    } catch {
      setCopyMessage("Không thể sao chép tự động. Vui lòng ghi lại mã đặt bàn");
    }
  }

  if (successCode) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-12 sm:px-6">
        <Card className="w-full border-[#e9e0d2] bg-[#fffdf9]">
          <CardHeader className="text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-green-100 text-2xl text-green-700">
              ✓
            </div>
            <CardTitle className="text-2xl text-[#3f2d22]">
              Đã nhận yêu cầu đặt bàn
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-stone-600">
              Quán sẽ xác nhận đặt bàn của bạn. Vui lòng lưu mã này.
            </p>
            <p className="mt-5 text-3xl font-bold tracking-wider text-[#68452f]">
              {successCode}
            </p>
            <p className="mt-3 text-sm text-stone-600">
              {formatDate(date)} lúc {selectedTime} · {guests} khách
            </p>
            <Button className="mt-5" onClick={copyCode} type="button">
              Sao chép mã
            </Button>
            {copyMessage && (
              <p aria-live="polite" className="mt-2 text-sm text-stone-600">
                {copyMessage}
              </p>
            )}
            <div>
              <Link
                className="mt-4 inline-block text-sm font-medium text-[#68452f] underline underline-offset-4"
                href="/"
              >
                Về trang chủ
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9a6b45]">
          Trải nghiệm tại quán
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#3f2d22] sm:text-4xl">
          Đặt bàn
        </h1>
        <p className="mt-2 text-stone-600">
          Chọn ngày, khung giờ và để chúng tôi chuẩn bị chỗ ngồi cho bạn.
        </p>
      </div>

      <form
        className="grid gap-6 lg:grid-cols-[1fr_0.9fr]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="space-y-6">
          <Card className="border-[#e9e0d2] bg-[#fffdf9]">
            <CardHeader>
              <CardTitle className="text-lg text-[#3f2d22]">
                1. Chọn ngày và số khách
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Calendar
                maxDate={maxDate}
                minDate={initialDate}
                onSelect={changeDate}
                selected={date}
              />
              <div className="flex items-center justify-between rounded-xl bg-[#f7f2e9] p-4">
                <div>
                  <p className="font-medium text-[#3f2d22]">Số khách</p>
                  <p className="text-sm text-stone-500">Tối đa 20 khách</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    aria-label="Giảm số khách"
                    disabled={guests <= 1}
                    onClick={() => changeGuests(guests - 1)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    −
                  </Button>
                  <span className="min-w-6 text-center font-semibold">
                    {guests}
                  </span>
                  <Button
                    aria-label="Tăng số khách"
                    disabled={guests >= 20}
                    onClick={() => changeGuests(guests + 1)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    +
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#e9e0d2] bg-[#fffdf9]">
            <CardHeader>
              <CardTitle className="text-lg text-[#3f2d22]">
                2. Chọn khung giờ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 12 }, (_, index) => (
                    <div
                      className="h-12 animate-pulse rounded-lg bg-[#e9e0d2]"
                      key={index}
                    />
                  ))}
                </div>
              ) : slotsError ? (
                <div>
                  <p className="text-sm text-red-700">{slotsError}</p>
                  <Button
                    className="mt-3"
                    onClick={() => setReloadSlots((value) => value + 1)}
                    type="button"
                    variant="outline"
                  >
                    Tải lại
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        aria-pressed={selectedTime === slot.time}
                        className={`min-h-12 rounded-lg border px-2 py-2 text-sm transition-colors ${
                          selectedTime === slot.time
                            ? "border-[#68452f] bg-[#68452f] text-white"
                            : slot.available
                              ? "border-[#e9e0d2] bg-white text-[#3f2d22] hover:border-[#9a6b45]"
                              : "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
                        }`}
                        disabled={!slot.available}
                        key={slot.time}
                        onClick={() => {
                          setSelectedTime(slot.time);
                          form.setValue("timeSlot", slot.time, {
                            shouldValidate: true,
                          });
                        }}
                        type="button"
                      >
                        <span className="block font-semibold">{slot.time}</span>
                        <span className="block text-xs">
                          {slot.available
                            ? `Còn ${slot.remaining} chỗ`
                            : "Hết/đã qua"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-stone-500">
                    Chỉ nhận đặt trước tối thiểu{" "}
                    {RESERVATION_MIN_ADVANCE_MINUTES} phút.
                  </p>
                </>
              )}
              <input type="hidden" {...form.register("date")} value={date} />
              <input
                type="hidden"
                {...form.register("timeSlot")}
                value={selectedTime}
              />
              <input type="hidden" {...form.register("guests")} value={guests} />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-[#e9e0d2] bg-[#fffdf9]">
          <CardHeader>
            <CardTitle className="text-lg text-[#3f2d22]">
              3. Thông tin liên hệ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium text-[#3f2d22]">
              Họ tên
              <Input
                aria-invalid={Boolean(form.formState.errors.name)}
                autoComplete="name"
                {...form.register("name")}
              />
              <FieldError message={form.formState.errors.name?.message} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-[#3f2d22]">
              Số điện thoại
              <Input
                aria-invalid={Boolean(form.formState.errors.phone)}
                autoComplete="tel"
                inputMode="tel"
                {...form.register("phone")}
              />
              <FieldError message={form.formState.errors.phone?.message} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-[#3f2d22]">
              Ghi chú (không bắt buộc)
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                maxLength={200}
                {...form.register("note")}
              />
              <FieldError message={form.formState.errors.note?.message} />
            </label>
            {submitError && (
              <p aria-live="polite" className="text-sm text-red-700">
                {submitError}
              </p>
            )}
            <Button
              className="w-full"
              disabled={form.formState.isSubmitting || !selectedTime}
              type="submit"
            >
              {form.formState.isSubmitting ? "Đang gửi..." : "Gửi yêu cầu đặt bàn"}
            </Button>
            <p className="text-center text-xs text-stone-500">
              Quán sẽ liên hệ xác nhận đặt bàn của bạn.
            </p>
          </CardContent>
        </Card>
      </form>
    </main>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="block text-xs text-red-700">{message}</span> : null;
}

function addDays(date: string, days: number): string {
  return new Date(
    new Date(`${date}T00:00:00.000Z`).getTime() + days * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
