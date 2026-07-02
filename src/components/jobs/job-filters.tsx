"use client";

export interface JobFiltersValues {
  salaryMin: string;
  remoteOnly: boolean;
  provider: string;
}

interface JobFiltersProps {
  values: JobFiltersValues;
  onChange: (values: JobFiltersValues) => void;
  disabled?: boolean;
}

const PROVIDER_OPTIONS = [
  { value: "", label: "All providers" },
  { value: "ADZUNA", label: "Adzuna" },
  { value: "REED", label: "Reed" },
];

export function JobFilters({ values, onChange, disabled }: JobFiltersProps) {
  return (
    <fieldset
      disabled={disabled}
      className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400"
    >
      <legend className="sr-only">Filters</legend>

      <label className="flex items-center gap-2">
        <span>Min salary</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={values.salaryMin}
          onChange={(event) => onChange({ ...values, salaryMin: event.target.value })}
          placeholder="e.g. 50000"
          className="w-28 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={values.remoteOnly}
          onChange={(event) => onChange({ ...values, remoteOnly: event.target.checked })}
        />
        <span>Remote only</span>
      </label>

      <label className="flex items-center gap-2">
        <span>Provider</span>
        <select
          value={values.provider}
          onChange={(event) => onChange({ ...values, provider: event.target.value })}
          className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {PROVIDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}
