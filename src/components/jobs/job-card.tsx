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

export interface JobCardMatchInfo {
  score: number;
  reason: string;
  missingSkills: string[];
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
  /** Provided on both Job Search and Saved Jobs — creates an Application ("Mark as applied"). */
  onMarkApplied?: (jobId: string) => Promise<void>;
  /** Provided on the Dashboard — marks the job DISMISSED so future recommendation runs exclude it. */
  onDismiss?: (jobId: string) => Promise<void>;
  /** Provided on the Dashboard — an AI match score/reason/missing-skills snapshot for this job. */
  matchScore?: JobCardMatchInfo;
}

export function JobCard({
  job,
  onSave,
  savedAt,
  onMarkApplied,
  onDismiss,
  matchScore,
}: JobCardProps) {
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
        <div className="flex items-center gap-2">
          {matchScore ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {matchScore.score}/100
            </span>
          ) : null}
          <ProviderBadge provider={job.provider} />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span>{formatLocation(job.location)}</span>
        {salary ? <span>{salary}</span> : null}
        {posted ? <span>Posted {posted}</span> : null}
        {savedOn ? <span>Saved {savedOn}</span> : null}
      </div>

      {matchScore ? (
        <div className="flex flex-col gap-1 rounded-md bg-zinc-50 p-2 text-sm dark:bg-zinc-900">
          <p className="line-clamp-2 text-zinc-700 dark:text-zinc-300">{matchScore.reason}</p>
          {matchScore.missingSkills.length > 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Missing skills: {matchScore.missingSkills.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

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
        {onDismiss ? (
          <ActionButton
            onClick={() => onDismiss(job.id)}
            idleLabel="Dismiss"
            pendingLabel="Dismissing…"
            doneLabel="Dismissed ✓"
          />
        ) : null}
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
