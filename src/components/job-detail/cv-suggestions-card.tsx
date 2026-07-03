"use client";

import { useAiAction } from "@/components/shared/use-ai-action";
import { suggestCvImprovements, type CvSuggestionsJson } from "@/lib/api/ai-client";

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  LOW: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
};

interface CvSuggestionsCardProps {
  jobId: string;
}

export function CvSuggestionsCard({ jobId }: CvSuggestionsCardProps) {
  const { status, result, errorMessage, run } = useAiAction<CvSuggestionsJson>(() =>
    suggestCvImprovements(jobId),
  );

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Improve CV</h2>
        <button
          type="button"
          onClick={() => void run()}
          disabled={status === "loading"}
          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {status === "loading"
            ? "Analyzing…"
            : status === "error"
              ? "Retry"
              : result
                ? "Re-analyze"
                : "Improve CV"}
        </button>
      </div>

      {status === "loading" ? (
        <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
          {result ? "Refreshing suggestions…" : "Analyzing your CV against this job…"}
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <ul className="flex flex-col gap-2">
          {result.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[suggestion.priority]}`}
              >
                {suggestion.priority}
              </span>
              <span className="text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">{suggestion.category}:</span> {suggestion.text}
              </span>
            </li>
          ))}
        </ul>
      ) : status === "idle" ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Get suggestions to improve your CV for this role.
        </p>
      ) : null}
    </section>
  );
}
