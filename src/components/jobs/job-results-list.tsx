import type { JobSearchResult } from "@/lib/api/jobs-client";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { JobCard } from "./job-card";
import { LoadingState } from "./loading-state";

export type JobResultsStatus = "idle" | "loading" | "success" | "error";

interface JobResultsListProps {
  status: JobResultsStatus;
  jobs: JobSearchResult[];
  errorMessage?: string;
  onRetry?: () => void;
  onSaveJob?: (jobId: string) => Promise<void>;
  onMarkApplied?: (jobId: string) => Promise<void>;
}

export function JobResultsList({
  status,
  jobs,
  errorMessage,
  onRetry,
  onSaveJob,
  onMarkApplied,
}: JobResultsListProps) {
  if (status === "loading") return <LoadingState />;
  if (status === "error") {
    return <ErrorState message={errorMessage ?? "Unknown error"} onRetry={onRetry} />;
  }
  if (jobs.length === 0) {
    return status === "success" ? (
      <EmptyState
        title="No jobs found"
        description="Try a broader keyword, clear filters, or a different location."
      />
    ) : (
      <EmptyState
        title="Search for your next role"
        description="Enter a keyword or location above and press Search to get started."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {jobs.map((job) => (
        <li key={job.id}>
          <JobCard job={job} onSave={onSaveJob} onMarkApplied={onMarkApplied} />
        </li>
      ))}
    </ul>
  );
}
