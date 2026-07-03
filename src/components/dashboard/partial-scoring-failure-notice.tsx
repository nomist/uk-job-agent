interface PartialScoringFailureNoticeProps {
  failedCount: number;
}

/** Shown when at least one candidate failed AI scoring this run but others still succeeded. */
export function PartialScoringFailureNotice({ failedCount }: PartialScoringFailureNoticeProps) {
  if (failedCount <= 0) return null;

  return (
    <p
      role="status"
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
    >
      {failedCount} job{failedCount === 1 ? "" : "s"} couldn&apos;t be scored this run — click
      Refresh recommendations again to retry {failedCount === 1 ? "it" : "them"}.
    </p>
  );
}
