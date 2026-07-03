"use client";

import type { RecommendationSearchFiltersJson } from "@/lib/api/dashboard-client";
import {
  VISA_STATUSES,
  WORK_MODES,
  type VisaStatusValue,
  type WorkModeValue,
} from "@/lib/api/profile-client";

interface RecommendationFiltersFormProps {
  values: RecommendationSearchFiltersJson;
  onChange: (values: RecommendationSearchFiltersJson) => void;
  forceRescore: boolean;
  onForceRescoreChange: (value: boolean) => void;
  maxJobsToScoreCap: number;
  disabled?: boolean;
  onRefresh: () => void;
}

const VISA_LABELS: Record<VisaStatusValue, string> = {
  REQUIRES_SPONSORSHIP: "Requires sponsorship",
  NO_SPONSORSHIP_NEEDED: "No sponsorship needed",
  UNKNOWN: "Unspecified",
};

const WORK_MODE_LABELS: Record<WorkModeValue, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "Onsite",
};

function parseListInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const inputClass =
  "rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900";

/**
 * Every field is prefilled from the Profile/Resume (see DashboardScreen) and
 * freely user-adjustable from there — nothing here calls the API itself;
 * `onRefresh` is the only trigger, and it's always an explicit click.
 */
export function RecommendationFiltersForm({
  values,
  onChange,
  forceRescore,
  onForceRescoreChange,
  maxJobsToScoreCap,
  disabled,
  onRefresh,
}: RecommendationFiltersFormProps) {
  function toggleWorkMode(mode: WorkModeValue) {
    const next = values.workModes.includes(mode)
      ? values.workModes.filter((existing) => existing !== mode)
      : [...values.workModes, mode];
    onChange({ ...values, workModes: next });
  }

  function handleMaxJobsToScoreChange(raw: string) {
    const parsed = Number(raw);
    const clamped = Number.isFinite(parsed) ? Math.min(maxJobsToScoreCap, Math.max(1, parsed)) : 1;
    onChange({ ...values, maxJobsToScore: clamped });
  }

  return (
    <fieldset
      disabled={disabled}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Recommendation settings
      </legend>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Target title / headline</span>
        <input
          type="text"
          value={values.headline ?? ""}
          onChange={(event) => onChange({ ...values, headline: event.target.value || undefined })}
          placeholder="e.g. Staff Backend Engineer"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Skills (comma separated)</span>
        <input
          type="text"
          value={values.skills.join(", ")}
          onChange={(event) => onChange({ ...values, skills: parseListInput(event.target.value) })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          Preferred locations (comma separated)
        </span>
        <input
          type="text"
          value={values.locations.join(", ")}
          onChange={(event) =>
            onChange({ ...values, locations: parseListInput(event.target.value) })
          }
          className={inputClass}
        />
      </label>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Work mode</span>
        {WORK_MODES.map((mode) => (
          <label key={mode} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={values.workModes.includes(mode)}
              onChange={() => toggleWorkMode(mode)}
            />
            {WORK_MODE_LABELS[mode]}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">Min salary</span>
          <input
            type="number"
            min={0}
            value={values.salaryMin ?? ""}
            onChange={(event) =>
              onChange({
                ...values,
                salaryMin: event.target.value ? Number(event.target.value) : undefined,
              })
            }
            className={`w-28 ${inputClass}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">Max salary</span>
          <input
            type="number"
            min={0}
            value={values.salaryMax ?? ""}
            onChange={(event) =>
              onChange({
                ...values,
                salaryMax: event.target.value ? Number(event.target.value) : undefined,
              })
            }
            className={`w-28 ${inputClass}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">Currency</span>
          <input
            type="text"
            value={values.salaryCurrency ?? ""}
            onChange={(event) =>
              onChange({ ...values, salaryCurrency: event.target.value || undefined })
            }
            placeholder="GBP"
            className={`w-20 ${inputClass}`}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">Visa status</span>
          <select
            value={values.visaStatus}
            onChange={(event) =>
              onChange({ ...values, visaStatus: event.target.value as VisaStatusValue })
            }
            className={inputClass}
          >
            {VISA_STATUSES.map((status) => (
              <option key={status} value={status}>
                {VISA_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">Years of experience</span>
          <input
            type="number"
            min={0}
            value={values.yearsOfExperience ?? ""}
            onChange={(event) =>
              onChange({
                ...values,
                yearsOfExperience: event.target.value ? Number(event.target.value) : undefined,
              })
            }
            className={`w-24 ${inputClass}`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">Max jobs to score</span>
          <input
            type="number"
            min={1}
            max={maxJobsToScoreCap}
            value={values.maxJobsToScore}
            onChange={(event) => handleMaxJobsToScoreChange(event.target.value)}
            className={`w-20 ${inputClass}`}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={forceRescore}
          onChange={(event) => onForceRescoreChange(event.target.checked)}
        />
        <span>Force rescore (ignore recently scored jobs)</span>
      </label>

      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This will score up to {values.maxJobsToScore} job{values.maxJobsToScore === 1 ? "" : "s"}.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {disabled ? "Refreshing…" : "Refresh recommendations"}
        </button>
      </div>
    </fieldset>
  );
}
