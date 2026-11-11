import { Suspense } from "react";
import { ReservationForm } from "@/components/shop/reservation-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHoChiMinhDate } from "@/services/reservation";

async function ReservationContent() {
  const session = await auth();
  const user = session?.user.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, phone: true },
      })
    : null;

  return (
    <ReservationForm
      initialDate={getHoChiMinhDate()}
      initialName={user?.name ?? session?.user.name ?? ""}
      initialPhone={user?.phone ?? ""}
    />
  );
}

export default function ReservationPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
          <div className="h-10 w-48 animate-pulse rounded bg-border" />
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="h-[34rem] animate-pulse rounded-2xl bg-border" />
            <div className="h-[34rem] animate-pulse rounded-2xl bg-border" />
          </div>
        </main>
      }
    >
      <ReservationContent />
    </Suspense>
  );
}
