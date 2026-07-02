export function MockDataNotice() {
  return (
    <p
      role="status"
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
    >
      Showing sample jobs because API keys are not configured.
    </p>
  );
}
