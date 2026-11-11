export default function TrackLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
      <div className="h-10 w-64 animate-pulse rounded bg-border" />
      <div className="mt-7 h-72 animate-pulse rounded-2xl bg-border" />
    </main>
  );
}
