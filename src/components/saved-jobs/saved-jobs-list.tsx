import { JobCard } from "@/components/jobs/job-card";
import { EmptyState } from "@/components/jobs/empty-state";
import { ErrorState } from "@/components/jobs/error-state";
import { LoadingState } from "@/components/jobs/loading-state";
import { DeleteButton } from "@/components/shared/delete-button";
import type { SavedJobWithDetailsJson } from "@/lib/api/saved-jobs-client";

export type SavedJobsStatus = "loading" | "success" | "error";

interface SavedJobsListProps {
  status: SavedJobsStatus;
  savedJobs: SavedJobWithDetailsJson[];
  errorMessage?: string;
  onRetry?: () => void;
  onMarkApplied?: (jobId: string) => Promise<void>;
  onDelete: (savedJobId: string) => Promise<void>;
}

export function SavedJobsList({
  status,
  savedJobs,
  errorMessage,
  onRetry,
  onMarkApplied,
  onDelete,
}: SavedJobsListProps) {
  if (status === "loading") return <LoadingState />;
  if (status === "error") {
    return <ErrorState message={errorMessage ?? "Unknown error"} onRetry={onRetry} />;
  }
  if (savedJobs.length === 0) {
    return (
      <EmptyState
        title="No saved jobs yet"
        description="Save jobs from search results to see them here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {savedJobs.map(({ savedJob, job }) => (
        <li key={savedJob.id} className="flex flex-col gap-2">
          <JobCard job={job} savedAt={savedJob.savedAt} onMarkApplied={onMarkApplied} />
          <DeleteButton
            onDelete={() => onDelete(savedJob.id)}
            confirmMessage={`Remove "${job.title}" from your saved jobs? This can't be undone.`}
            label="Remove from saved"
          />
        </li>
      ))}
    </ul>
  );
}
