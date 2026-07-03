import { EmptyState } from "@/components/jobs/empty-state";
import { JobCard } from "@/components/jobs/job-card";
import type { RecommendationItemJson } from "@/lib/api/dashboard-client";

interface RecommendationListProps {
  items: RecommendationItemJson[];
  onSaveJob: (jobId: string) => Promise<void>;
  onDismissJob: (jobId: string) => Promise<void>;
  onMarkApplied: (jobId: string) => Promise<void>;
}

/** Already sorted by match score descending (RecommendationRun sorts defensively) — rendered in that order, no client-side re-sort. */
export function RecommendationList({
  items,
  onSaveJob,
  onDismissJob,
  onMarkApplied,
}: RecommendationListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No recommendations from this run"
        description="Nothing matched well enough to score, or every candidate was already saved, dismissed, or applied to. Try adjusting your settings above."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.jobId}>
          <JobCard
            job={item.job}
            matchScore={{
              score: item.score,
              reason: item.reason,
              missingSkills: item.missingSkills,
            }}
            onSave={onSaveJob}
            onDismiss={onDismissJob}
            onMarkApplied={onMarkApplied}
          />
        </li>
      ))}
    </ul>
  );
}
