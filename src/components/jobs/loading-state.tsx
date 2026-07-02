export function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 py-10">
      <span className="sr-only">Loading jobs…</span>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
        />
      ))}
    </div>
  );
}
