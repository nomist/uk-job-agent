"use client";

import { useState } from "react";
import type { JobSearchResult } from "@/lib/api/jobs-client";

const PROVIDER_LABELS: Record<string, string> = {
  ADZUNA: "Adzuna",
  REED: "Reed",
};

const PROVIDER_COLORS: Record<string, string> = {
  ADZUNA: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  REED: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

function ProviderBadge({ provider }: { provider: string }) {
  const label = PROVIDER_LABELS[provider] ?? provider;
  const colorClass =
    PROVIDER_COLORS[provider] ?? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>{label}</span>
  );
}

function formatSalary(salaryRange: JobSearchResult["salaryRange"]): string | null {
  if (!salaryRange) return null;
  const formatter = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
  return `${salaryRange.currency} ${formatter.format(salaryRange.min)} - ${formatter.format(salaryRange.max)}`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatLocation(location: JobSearchResult["location"]): string {
  if (location.isRemote) {
    return location.city ? `Remote · ${location.city}` : "Remote";
  }
  return [location.city, location.country].filter(Boolean).join(", ");
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveButtonProps {
  onSave: (jobId: string) => Promise<void>;
  jobId: string;
}

function SaveButton({ onSave, jobId }: SaveButtonProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();

  async function handleClick() {
    setStatus("saving");
    setErrorMessage(undefined);
    try {
      await onSave(jobId);
      setStatus("saved");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save.");
      setStatus("error");
    }
  }

  if (status === "saved") {
    return (
      <span className="rounded-md border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
        Saved ✓
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status === "error" ? (
        <span className="text-xs text-red-600 dark:text-red-400">{errorMessage}</span>
      ) : null}
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "saving"}
        className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {status === "saving" ? "Saving…" : status === "error" ? "Retry" : "Save"}
      </button>
    </div>
  );
}

interface JobCardProps {
  job: JobSearchResult;
  /** Provided on the Job Search screen to make the Save button functional; omitted elsewhere. */
  onSave?: (jobId: string) => Promise<void>;
  /**
   * Provided on the Saved Jobs screen — when set, this card is already
   * known to be saved, so it shows "Saved on <date>" instead of the
   * interactive Save button.
   */
  savedAt?: string;
}

export function JobCard({ job, onSave, savedAt }: JobCardProps) {
  const salary = formatSalary(job.salaryRange);
  const posted = formatDate(job.postedAt);
  const savedOn = formatDate(savedAt ?? null);

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{job.title}</h3>
          {/* companyId is a normalized placeholder, not a display name — no
              Company entity is persisted/joined yet (see the Adzuna/Reed
              mapper decisions). Shown as-is until that lands. */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{job.companyId}</p>
        </div>
        <ProviderBadge provider={job.provider} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span>{formatLocation(job.location)}</span>
        {salary ? <span>{salary}</span> : null}
        {posted ? <span>Posted {posted}</span> : null}
        {savedOn ? <span>Saved {savedOn}</span> : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-zinc-900 underline underline-offset-2 hover:no-underline dark:text-zinc-50"
        >
          View original listing
        </a>
        <span className="flex-1" />
        {savedAt ? null : onSave ? (
          <SaveButton onSave={onSave} jobId={job.id} />
        ) : (
          <span className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">
            Save
          </span>
        )}
        <button
          type="button"
          disabled
          title="Coming soon"
          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-400 disabled:cursor-not-allowed dark:border-zinc-700 dark:text-zinc-600"
        >
          Score match
        </button>
      </div>
    </article>
  );
}
