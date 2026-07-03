"use client";

import { useEffect, useState } from "react";
import { createApplication } from "@/lib/api/applications-client";
import { CURRENT_USER_ID } from "@/lib/api/current-user";
import {
  deleteSavedJob,
  listSavedJobs,
  type SavedJobWithDetailsJson,
} from "@/lib/api/saved-jobs-client";
import { SavedJobsList, type SavedJobsStatus } from "./saved-jobs-list";

export function SavedJobsScreen() {
  const [status, setStatus] = useState<SavedJobsStatus>("loading");
  const [savedJobs, setSavedJobs] = useState<SavedJobWithDetailsJson[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  async function fetchSavedJobs() {
    try {
      const result = await listSavedJobs(CURRENT_USER_ID);
      setSavedJobs(result.savedJobs);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
  }

  useEffect(() => {
    // Fetch-on-mount is a legitimate effect (syncing local state with a
    // server resource on load) per
    // https://react.dev/learn/you-might-not-need-an-effect#fetching-data —
    // react-hooks/set-state-in-effect flags it anyway because its static
    // analysis can't see that the setState calls inside fetchSavedJobs()
    // only run after an await, not synchronously during this render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSavedJobs();
  }, []);

  function handleRetry() {
    setStatus("loading");
    setErrorMessage(undefined);
    void fetchSavedJobs();
  }

  async function handleMarkApplied(jobId: string) {
    await createApplication(jobId, CURRENT_USER_ID);
  }

  async function handleDelete(savedJobId: string) {
    await deleteSavedJob(savedJobId);
    // Update the list immediately on success — no need to refetch.
    setSavedJobs((current) => current.filter((item) => item.savedJob.id !== savedJobId));
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Saved Jobs</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Jobs you&apos;ve saved for later.
        </p>
      </div>

      <SavedJobsList
        status={status}
        savedJobs={savedJobs}
        errorMessage={errorMessage}
        onRetry={handleRetry}
        onMarkApplied={handleMarkApplied}
        onDelete={handleDelete}
      />
    </main>
  );
}
