import type { JobSearchResult } from "@/lib/api/jobs-client";

// Small presentational helpers shared by JobCard and ApplicationCard — pure
// formatting/labeling, no business logic (nothing here decides what's
// allowed, only how to display it).

export const PROVIDER_LABELS: Record<string, string> = {
  ADZUNA: "Adzuna",
  REED: "Reed",
};

const PROVIDER_COLORS: Record<string, string> = {
  ADZUNA: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  REED: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

export function ProviderBadge({ provider }: { provider: string }) {
  const label = PROVIDER_LABELS[provider] ?? provider;
  const colorClass =
    PROVIDER_COLORS[provider] ?? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>{label}</span>
  );
}

export function formatSalary(salaryRange: JobSearchResult["salaryRange"]): string | null {
  if (!salaryRange) return null;
  const formatter = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
  return `${salaryRange.currency} ${formatter.format(salaryRange.min)} - ${formatter.format(salaryRange.max)}`;
}

export function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatLocation(location: JobSearchResult["location"]): string {
  if (location.isRemote) {
    return location.city ? `Remote · ${location.city}` : "Remote";
  }
  return [location.city, location.country].filter(Boolean).join(", ");
}
