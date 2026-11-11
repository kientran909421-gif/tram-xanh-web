export default function TrackLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
      <div className="h-10 w-64 animate-pulse rounded bg-[#e9e0d2]" />
      <div className="mt-7 h-72 animate-pulse rounded-2xl bg-[#e9e0d2]" />
    </main>
  );
}
