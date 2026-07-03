"use client";

import { useState, type FormEvent } from "react";
import {
  VISA_STATUSES,
  WORK_MODES,
  type ProfileJson,
  type UpsertProfileInput,
  type VisaStatusValue,
  type WorkModeValue,
} from "@/lib/api/profile-client";

const WORK_MODE_LABELS: Record<WorkModeValue, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "Onsite",
};

const VISA_STATUS_LABELS: Record<VisaStatusValue, string> = {
  REQUIRES_SPONSORSHIP: "Requires sponsorship",
  NO_SPONSORSHIP_NEEDED: "No sponsorship needed",
  UNKNOWN: "Prefer not to say",
};

function parseListInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const inputClassName =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-50";
const labelClassName = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

interface ProfileFormProps {
  initialProfile: ProfileJson | null;
  onSave: (input: UpsertProfileInput) => Promise<void>;
}

export function ProfileForm({ initialProfile, onSave }: ProfileFormProps) {
  const [headline, setHeadline] = useState(initialProfile?.headline ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState(
    initialProfile?.yearsOfExperience?.toString() ?? "",
  );
  const [skills, setSkills] = useState(initialProfile?.skills.join(", ") ?? "");
  const [preferredLocations, setPreferredLocations] = useState(
    initialProfile?.preferredLocations.join(", ") ?? "",
  );
  const [workPreferences, setWorkPreferences] = useState<WorkModeValue[]>(
    initialProfile?.workPreferences ?? [],
  );
  const [visaStatus, setVisaStatus] = useState<VisaStatusValue>(
    initialProfile?.visaStatus ?? "UNKNOWN",
  );
  const [salaryMin, setSalaryMin] = useState(
    initialProfile?.salaryExpectation?.min.toString() ?? "",
  );
  const [salaryMax, setSalaryMax] = useState(
    initialProfile?.salaryExpectation?.max.toString() ?? "",
  );
  const [salaryCurrency, setSalaryCurrency] = useState(
    initialProfile?.salaryExpectation?.currency ?? "GBP",
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>();

  function toggleWorkMode(mode: WorkModeValue) {
    setWorkPreferences((current) =>
      current.includes(mode) ? current.filter((existing) => existing !== mode) : [...current, mode],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage(undefined);

    const parsedYears = yearsOfExperience.trim() ? Number(yearsOfExperience) : undefined;
    const hasSalary = salaryMin.trim() !== "" || salaryMax.trim() !== "";

    try {
      await onSave({
        headline: headline.trim() || undefined,
        yearsOfExperience:
          parsedYears !== undefined && !Number.isNaN(parsedYears) ? parsedYears : undefined,
        skills: parseListInput(skills),
        preferredLocations: parseListInput(preferredLocations),
        workPreferences,
        visaStatus,
        salaryExpectation: hasSalary
          ? {
              min: Number(salaryMin) || 0,
              max: Number(salaryMax) || 0,
              currency: salaryCurrency.trim() || "GBP",
            }
          : undefined,
      });
      setStatus("saved");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save profile.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="headline" className={labelClassName}>
          Headline
        </label>
        <input
          id="headline"
          type="text"
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          placeholder="e.g. Senior Frontend Engineer"
          className={inputClassName}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="yearsOfExperience" className={labelClassName}>
          Years of experience
        </label>
        <input
          id="yearsOfExperience"
          type="number"
          min="0"
          value={yearsOfExperience}
          onChange={(event) => setYearsOfExperience(event.target.value)}
          className={`${inputClassName} w-32`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="skills" className={labelClassName}>
          Skills
        </label>
        <input
          id="skills"
          type="text"
          value={skills}
          onChange={(event) => setSkills(event.target.value)}
          placeholder="React, TypeScript, Node.js"
          className={inputClassName}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Separate with commas.</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="preferredLocations" className={labelClassName}>
          Preferred locations
        </label>
        <input
          id="preferredLocations"
          type="text"
          value={preferredLocations}
          onChange={(event) => setPreferredLocations(event.target.value)}
          placeholder="London, Manchester, Remote"
          className={inputClassName}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Separate with commas.</p>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className={labelClassName}>Work mode preference</legend>
        <div className="flex gap-4">
          {WORK_MODES.map((mode) => (
            <label
              key={mode}
              className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <input
                type="checkbox"
                checked={workPreferences.includes(mode)}
                onChange={() => toggleWorkMode(mode)}
              />
              {WORK_MODE_LABELS[mode]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="visaStatus" className={labelClassName}>
          Visa status
        </label>
        <select
          id="visaStatus"
          value={visaStatus}
          onChange={(event) => setVisaStatus(event.target.value as VisaStatusValue)}
          className={`${inputClassName} w-fit`}
        >
          {VISA_STATUSES.map((value) => (
            <option key={value} value={value}>
              {VISA_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className={labelClassName}>Salary expectation</legend>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={salaryMin}
            onChange={(event) => setSalaryMin(event.target.value)}
            aria-label="Minimum salary"
            className={`${inputClassName} w-24`}
          />
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={salaryMax}
            onChange={(event) => setSalaryMax(event.target.value)}
            aria-label="Maximum salary"
            className={`${inputClassName} w-24`}
          />
          <input
            type="text"
            placeholder="GBP"
            value={salaryCurrency}
            onChange={(event) => setSalaryCurrency(event.target.value)}
            aria-label="Salary currency"
            className={`${inputClassName} w-20`}
          />
        </div>
      </fieldset>

      {status === "error" ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}
      {status === "saved" ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Profile saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {status === "saving" ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
