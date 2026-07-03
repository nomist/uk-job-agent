"use client";

import { useEffect, useState } from "react";
import {
  deleteApplication,
  listApplications,
  updateApplicationStatus,
  type ApplicationStatusValue,
  type ApplicationWithDetailsJson,
} from "@/lib/api/applications-client";
import { CURRENT_USER_ID } from "@/lib/api/current-user";
import { ApplicationsBoard, type ApplicationsStatus } from "./applications-board";

export function ApplicationsScreen() {
  const [status, setStatus] = useState<ApplicationsStatus>("loading");
  const [applications, setApplications] = useState<ApplicationWithDetailsJson[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [updatingApplicationIds, setUpdatingApplicationIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [statusUpdateErrors, setStatusUpdateErrors] = useState<Record<string, string>>({});

  async function fetchApplications() {
    try {
      const result = await listApplications(CURRENT_USER_ID);
      setApplications(result.applications);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
  }

  useEffect(() => {
    void fetchApplications();
  }, []);

  function handleRetry() {
    setStatus("loading");
    setErrorMessage(undefined);
    void fetchApplications();
  }

  function replaceApplicationStatus(applicationId: string, newStatus: ApplicationStatusValue) {
    setApplications((current) =>
      current.map((item) =>
        item.application.id === applicationId
          ? { ...item, application: { ...item.application, status: newStatus } }
          : item,
      ),
    );
  }

  async function handleStatusChange(applicationId: string, newStatus: ApplicationStatusValue) {
    const target = applications.find((item) => item.application.id === applicationId);
    if (!target) return;
    const previousStatus = target.application.status;

    // Optimistic: flip the status (and therefore which group it renders
    // under) immediately, then reconcile with the server's response.
    replaceApplicationStatus(applicationId, newStatus);
    setStatusUpdateErrors((current) => {
      const next = { ...current };
      delete next[applicationId];
      return next;
    });
    setUpdatingApplicationIds((current) => new Set(current).add(applicationId));

    try {
      const updated = await updateApplicationStatus(applicationId, newStatus);
      setApplications((current) =>
        current.map((item) =>
          item.application.id === applicationId ? { ...item, application: updated } : item,
        ),
      );
    } catch (error) {
      replaceApplicationStatus(applicationId, previousStatus);
      setStatusUpdateErrors((current) => ({
        ...current,
        [applicationId]: error instanceof Error ? error.message : "Failed to update status.",
      }));
    } finally {
      setUpdatingApplicationIds((current) => {
        const next = new Set(current);
        next.delete(applicationId);
        return next;
      });
    }
  }

  async function handleDelete(applicationId: string) {
    await deleteApplication(applicationId);
    // Update the board immediately on success — no need to refetch.
    setApplications((current) => current.filter((item) => item.application.id !== applicationId));
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Applications</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Track applications you&apos;ve marked as applied, grouped by status.
        </p>
      </div>

      <ApplicationsBoard
        status={status}
        applications={applications}
        errorMessage={errorMessage}
        onRetry={handleRetry}
        onStatusChange={(applicationId, newStatus) =>
          void handleStatusChange(applicationId, newStatus)
        }
        onDelete={handleDelete}
        updatingApplicationIds={updatingApplicationIds}
        statusUpdateErrors={statusUpdateErrors}
      />
    </main>
  );
}
