import { JobCard } from "@/components/jobs/job-card";
import { EmptyState } from "@/components/jobs/empty-state";
import { ErrorState } from "@/components/jobs/error-state";
import { LoadingState } from "@/components/jobs/loading-state";
import type { SavedJobWithDetailsJson } from "@/lib/api/saved-jobs-client";

export type SavedJobsStatus = "loading" | "success" | "error";

interface SavedJobsListProps {
  status: SavedJobsStatus;
  savedJobs: SavedJobWithDetailsJson[];
  errorMessage?: string;
  onRetry?: () => void;
  onMarkApplied?: (jobId: string) => Promise<void>;
}

export function SavedJobsList({
  status,
  savedJobs,
  errorMessage,
  onRetry,
  onMarkApplied,
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
        <li key={savedJob.id}>
          <JobCard job={job} savedAt={savedJob.savedAt} onMarkApplied={onMarkApplied} />
        </li>
      ))}
    </ul>
  );
}
