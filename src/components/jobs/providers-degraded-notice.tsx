import { PROVIDER_LABELS } from "@/components/shared/job-display";

interface ProvidersDegradedNoticeProps {
  failedProviders: string[];
}

/** Shown when at least one configured provider failed this search but others still returned results. */
export function ProvidersDegradedNotice({ failedProviders }: ProvidersDegradedNoticeProps) {
  if (failedProviders.length === 0) return null;

  const labels = failedProviders.map((provider) => PROVIDER_LABELS[provider] ?? provider);
  const providerList =
    labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
  const isAre = labels.length === 1 ? "is" : "are";

  return (
    <p
      role="status"
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
    >
      {providerList} {isAre} temporarily unavailable — results below may be incomplete.
    </p>
  );
}
