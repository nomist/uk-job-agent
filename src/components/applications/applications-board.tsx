import { EmptyState } from "@/components/jobs/empty-state";
import { ErrorState } from "@/components/jobs/error-state";
import { LoadingState } from "@/components/jobs/loading-state";
import {
  APPLICATION_STATUSES,
  type ApplicationStatusValue,
  type ApplicationWithDetailsJson,
} from "@/lib/api/applications-client";
import { ApplicationCard } from "./application-card";

export type ApplicationsStatus = "loading" | "success" | "error";

const STATUS_GROUP_LABELS: Record<ApplicationStatusValue, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  HR_SCREEN: "HR Screen",
  TECHNICAL_INTERVIEW: "Technical Interview",
  FINAL_INTERVIEW: "Final Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

interface ApplicationsBoardProps {
  status: ApplicationsStatus;
  applications: ApplicationWithDetailsJson[];
  errorMessage?: string;
  onRetry?: () => void;
  onStatusChange: (applicationId: string, status: ApplicationStatusValue) => void;
  updatingApplicationIds: ReadonlySet<string>;
  statusUpdateErrors: Readonly<Record<string, string>>;
}

export function ApplicationsBoard({
  status,
  applications,
  errorMessage,
  onRetry,
  onStatusChange,
  updatingApplicationIds,
  statusUpdateErrors,
}: ApplicationsBoardProps) {
  if (status === "loading") return <LoadingState />;
  if (status === "error") {
    return <ErrorState message={errorMessage ?? "Unknown error"} onRetry={onRetry} />;
  }
  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Mark a job as applied from Job Search or Saved Jobs to track it here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {APPLICATION_STATUSES.map((groupStatus) => {
        const itemsInGroup = applications.filter((item) => item.application.status === groupStatus);
        if (itemsInGroup.length === 0) return null;

        return (
          <section key={groupStatus} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {STATUS_GROUP_LABELS[groupStatus]} ({itemsInGroup.length})
            </h2>
            <ul className="flex flex-col gap-3">
              {itemsInGroup.map((item) => (
                <li key={item.application.id}>
                  <ApplicationCard
                    item={item}
                    onStatusChange={(newStatus) => onStatusChange(item.application.id, newStatus)}
                    isUpdating={updatingApplicationIds.has(item.application.id)}
                    errorMessage={statusUpdateErrors[item.application.id]}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
