import { NextResponse } from "next/server";
import { reservationSlotsQuerySchema } from "@/lib/validations/reservation";
import { getSlots, ReservationError } from "@/services/reservation";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsed = reservationSlotsQuerySchema.safeParse({
    date: searchParams.get("date"),
    guests: searchParams.get("guests"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ngày hoặc số khách không hợp lệ" },
      { status: 400 },
    );
  }

  try {
    const slots = await getSlots(parsed.data.date, parsed.data.guests);
    return NextResponse.json({ slots });
  } catch (error) {
    if (error instanceof ReservationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load reservation slots:", error);
    return NextResponse.json(
      { error: "Không thể tải khung giờ đặt bàn lúc này" },
      { status: 500 },
    );
  }
}
