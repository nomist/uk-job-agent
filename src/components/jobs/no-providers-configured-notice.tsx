export function NoProvidersConfiguredNotice() {
  return (
    <p
      role="status"
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
    >
      No job search providers are configured. Add ADZUNA_APP_ID/ADZUNA_APP_KEY or REED_API_KEY to
      your environment to search real listings.
    </p>
  );
}
