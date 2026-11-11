export default function ReservationLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
      <div className="h-10 w-48 animate-pulse rounded bg-border" />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="h-[34rem] animate-pulse rounded-2xl bg-border" />
        <div className="h-[34rem] animate-pulse rounded-2xl bg-border" />
      </div>
    </main>
  );
}
