"use client";

import { useAiAction } from "@/components/shared/use-ai-action";
import { scoreJobMatch, type MatchScoreJson } from "@/lib/api/ai-client";

const CONFIDENCE_LABELS: Record<string, string> = {
  LOW: "Low confidence",
  MEDIUM: "Medium confidence",
  HIGH: "High confidence",
};

interface MatchScoreCardProps {
  jobId: string;
}

export function MatchScoreCard({ jobId }: MatchScoreCardProps) {
  const { status, result, errorMessage, run } = useAiAction<MatchScoreJson>(() =>
    scoreJobMatch(jobId),
  );

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Match score</h2>
        <button
          type="button"
          onClick={() => void run()}
          disabled={status === "loading"}
          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {status === "loading"
            ? "Scoring…"
            : status === "error"
              ? "Retry"
              : result
                ? "Re-score"
                : "Score match"}
        </button>
      </div>

      {status === "loading" ? (
        <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
          {result ? "Updating…" : "Generating your match score…"}
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {result.score}/100
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {CONFIDENCE_LABELS[result.confidence.band]}
            </span>
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{result.rationale}</p>
          {result.missingSkills.length > 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Missing skills: {result.missingSkills.join(", ")}
            </p>
          ) : null}
        </div>
      ) : status === "idle" ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          See how well this job matches your profile.
        </p>
      ) : null}
    </section>
  );
}
