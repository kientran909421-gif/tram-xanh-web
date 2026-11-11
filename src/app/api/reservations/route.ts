import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reservationSchema } from "@/lib/validations/reservation";
import { createReservation, ReservationError } from "@/services/reservation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu gửi lên không hợp lệ" },
      { status: 400 },
    );
  }

  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Thông tin đặt bàn không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const session = await auth();
    const reservation = await createReservation(parsed.data, session?.user.id);
    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    if (error instanceof ReservationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to create reservation:", error);
    return NextResponse.json(
      { error: "Không thể tạo đặt bàn lúc này" },
      { status: 500 },
    );
  }
}
