import type { RecommendationRunJson } from "@/lib/api/dashboard-client";

interface RecommendationRunSummaryProps {
  run: RecommendationRunJson;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

/** "Last refreshed at..." plus the found/filtered/selected/scored/failed funnel for one run. */
export function RecommendationRunSummary({ run }: RecommendationRunSummaryProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <p className="text-zinc-500 dark:text-zinc-400">
        Last refreshed at {formatDateTime(run.createdAt)}
      </p>
      <p className="text-zinc-700 dark:text-zinc-300">
        Found {run.rawResultCount} · Filtered to {run.candidateCount} · Selected{" "}
        {run.selectedForScoringCount} · Scored {run.scoredCount}
        {run.failedCount > 0 ? ` · Failed ${run.failedCount}` : ""}
      </p>
    </div>
  );
}
