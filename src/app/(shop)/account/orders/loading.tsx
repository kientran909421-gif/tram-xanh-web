export default function AccountOrdersLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-10 w-56 animate-pulse rounded bg-border" />
      <div className="mt-8 grid gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="h-28 animate-pulse rounded-2xl bg-border"
            key={index}
          />
        ))}
      </div>
    </main>
  );
}
