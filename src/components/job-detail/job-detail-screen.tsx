"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/jobs/error-state";
import { LoadingState } from "@/components/jobs/loading-state";
import {
  formatDate,
  formatLocation,
  formatSalary,
  ProviderBadge,
} from "@/components/shared/job-display";
import { getJob, type JobSearchResult } from "@/lib/api/jobs-client";
import { CoverLetterCard } from "./cover-letter-card";
import { CvSuggestionsCard } from "./cv-suggestions-card";
import { MatchScoreCard } from "./match-score-card";

type JobDetailStatus = "loading" | "success" | "error";

interface JobDetailScreenProps {
  jobId: string;
}

export function JobDetailScreen({ jobId }: JobDetailScreenProps) {
  const [status, setStatus] = useState<JobDetailStatus>("loading");
  const [job, setJob] = useState<JobSearchResult>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const fetchJob = useCallback(async () => {
    try {
      const result = await getJob(jobId);
      setJob(result);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
  }, [jobId]);

  useEffect(() => {
    // Fetch-on-mount/on-jobId-change is a legitimate effect (syncing local
    // state with a server resource) — see saved-jobs-screen.tsx for why
    // react-hooks/set-state-in-effect flags it anyway.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchJob();
  }, [fetchJob]);

  function handleRetry() {
    setStatus("loading");
    setErrorMessage(undefined);
    void fetchJob();
  }

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <LoadingState />
      </main>
    );
  }

  if (status === "error" || !job) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState message={errorMessage ?? "Unknown error"} onRetry={handleRetry} />
      </main>
    );
  }

  const salary = formatSalary(job.salaryRange);
  const posted = formatDate(job.postedAt);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{job.title}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{job.companyId}</p>
          </div>
          <ProviderBadge provider={job.provider} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
          <span>{formatLocation(job.location)}</span>
          {salary ? <span>{salary}</span> : null}
          {posted ? <span>Posted {posted}</span> : null}
        </div>

        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm font-medium text-zinc-900 underline underline-offset-2 hover:no-underline dark:text-zinc-50"
        >
          View original listing
        </a>

        <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {job.description}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <MatchScoreCard jobId={job.id} />
        <CoverLetterCard jobId={job.id} />
        <CvSuggestionsCard jobId={job.id} />
      </div>
    </main>
  );
}
