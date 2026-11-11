import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountOrders } from "@/components/shop/account-orders";

async function AccountOrdersContent() {
  const session = await auth();
  if (!session?.user.id) {
    redirect("/login");
  }

  return <AccountOrders />;
}

export default function AccountOrdersPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
          <div className="h-10 w-56 animate-pulse rounded bg-[#e9e0d2]" />
          <div className="mt-8 grid gap-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                className="h-28 animate-pulse rounded-2xl bg-[#e9e0d2]"
                key={index}
              />
            ))}
          </div>
        </main>
      }
    >
      <AccountOrdersContent />
    </Suspense>
  );
}
