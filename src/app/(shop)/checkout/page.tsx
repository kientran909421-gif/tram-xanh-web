import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "@/components/shop/checkout-form";

async function CheckoutContent() {
  const session = await auth();
  const user = session?.user.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, phone: true },
      })
    : null;

  return (
    <CheckoutForm
      initialName={user?.name ?? session?.user.name ?? ""}
      initialPhone={user?.phone ?? ""}
    />
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
          <div className="h-10 w-48 animate-pulse rounded bg-border" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_23rem]">
            <div className="h-[34rem] animate-pulse rounded-2xl bg-border" />
            <div className="h-96 animate-pulse rounded-2xl bg-border" />
          </div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
