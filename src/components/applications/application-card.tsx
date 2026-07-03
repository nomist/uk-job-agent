import { formatDate, formatLocation, ProviderBadge } from "@/components/shared/job-display";
import { DeleteButton } from "@/components/shared/delete-button";
import {
  APPLICATION_STATUSES,
  type ApplicationStatusValue,
  type ApplicationWithDetailsJson,
} from "@/lib/api/applications-client";

const STATUS_LABELS: Record<ApplicationStatusValue, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  HR_SCREEN: "HR Screen",
  TECHNICAL_INTERVIEW: "Technical Interview",
  FINAL_INTERVIEW: "Final Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

interface ApplicationCardProps {
  item: ApplicationWithDetailsJson;
  onStatusChange: (status: ApplicationStatusValue) => void;
  onDelete: (applicationId: string) => Promise<void>;
  isUpdating?: boolean;
  errorMessage?: string;
}

export function ApplicationCard({
  item,
  onStatusChange,
  onDelete,
  isUpdating,
  errorMessage,
}: ApplicationCardProps) {
  const { application, job } = item;
  const appliedOn = formatDate(application.appliedAt);

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{job.title}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{job.companyId}</p>
        </div>
        <ProviderBadge provider={job.provider} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span>{formatLocation(job.location)}</span>
        {appliedOn ? <span>Applied {appliedOn}</span> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`status-${application.id}`}>
          Status for {job.title}
        </label>
        <select
          id={`status-${application.id}`}
          value={application.status}
          disabled={isUpdating}
          onChange={(event) => onStatusChange(event.target.value as ApplicationStatusValue)}
          className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {errorMessage ? (
          <span className="text-xs text-red-600 dark:text-red-400">{errorMessage}</span>
        ) : null}
        <span className="flex-1" />
        <DeleteButton
          onDelete={() => onDelete(application.id)}
          confirmMessage={`Delete your application for "${job.title}"? This can't be undone.`}
        />
      </div>
    </article>
  );
}
