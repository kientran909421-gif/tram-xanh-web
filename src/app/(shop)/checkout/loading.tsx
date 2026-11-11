export default function CheckoutLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-10 w-48 animate-pulse rounded bg-border" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_23rem]">
        <div className="h-[34rem] animate-pulse rounded-2xl bg-border" />
        <div className="h-96 animate-pulse rounded-2xl bg-border" />
      </div>
    </main>
  );
}
