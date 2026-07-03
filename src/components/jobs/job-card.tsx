"use client";

import Link from "next/link";
import type { JobSearchResult } from "@/lib/api/jobs-client";
import { ActionButton } from "@/components/shared/action-button";
import {
  formatDate,
  formatLocation,
  formatSalary,
  ProviderBadge,
} from "@/components/shared/job-display";

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
  /** Provided on both Job Search and Saved Jobs — creates an Application ("Mark as applied"). */
  onMarkApplied?: (jobId: string) => Promise<void>;
}

export function JobCard({ job, onSave, savedAt, onMarkApplied }: JobCardProps) {
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

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-zinc-900 underline underline-offset-2 hover:no-underline dark:text-zinc-50"
        >
          View original listing
        </a>
        <Link
          href={`/jobs/${job.id}`}
          className="text-sm font-medium text-zinc-600 underline underline-offset-2 hover:no-underline dark:text-zinc-400"
        >
          Match score, cover letter &amp; CV tips
        </Link>
        <span className="flex-1" />
        {savedAt ? null : onSave ? (
          <ActionButton
            onClick={() => onSave(job.id)}
            idleLabel="Save"
            pendingLabel="Saving…"
            doneLabel="Saved ✓"
          />
        ) : (
          <span className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">
            Save
          </span>
        )}
        {onMarkApplied ? (
          <ActionButton
            onClick={() => onMarkApplied(job.id)}
            idleLabel="Mark as applied"
            pendingLabel="Marking…"
            doneLabel="Applied ✓"
          />
        ) : null}
      </div>
    </article>
  );
}
