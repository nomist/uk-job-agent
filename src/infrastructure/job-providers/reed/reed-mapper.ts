import { normalizeCompanyName } from "@/domain/entities/company";
import { EmploymentType } from "@/domain/value-objects/employment-type";
import { WorkMode } from "@/domain/value-objects/work-mode";
import { JobProviderListing, JobProviderListingLocation } from "@/application/dto/job-provider.dto";
import { ReedJobResult } from "./reed-types";

const DEFAULT_CURRENCY = "GBP";

/**
 * Reed returns dates as "dd/mm/yyyy" (UK format) — `new Date(string)` would
 * misparse this as US mm/dd/yyyy (e.g. "05/07/2026" as 7 May instead of
 * 5 July), so the parts are parsed explicitly instead.
 */
function parseReedDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return undefined;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Same heuristic as the Adzuna adapter — Reed has no explicit remote field.
function inferIsRemote(locationName: string | undefined, title: string): boolean {
  return /remote/i.test(locationName ?? "") || /remote/i.test(title);
}

// Reed only ever returns a flat location string (no hierarchical area
// breakdown like Adzuna), and the API is UK-only, so country is constant.
function mapLocation(result: ReedJobResult): JobProviderListingLocation {
  const locationName = result.locationName?.trim();

  return {
    country: "UK",
    city: locationName || undefined,
    isRemote: inferIsRemote(locationName, result.jobTitle ?? ""),
  };
}

// Reed exposes only fullTime/partTime booleans — no contract/permanent
// distinction, so CONTRACT/TEMPORARY/INTERNSHIP can never be produced here
// (same limitation as the Adzuna adapter, different raw shape).
function mapEmploymentType(result: ReedJobResult): EmploymentType | undefined {
  if (result.fullTime === true) return "FULL_TIME";
  if (result.partTime === true) return "PART_TIME";
  return undefined;
}

function mapWorkMode(location: JobProviderListingLocation): WorkMode | undefined {
  return location.isRemote ? "REMOTE" : undefined;
}

/**
 * Maps one raw Reed result to a normalized JobProviderListing, or returns
 * null when a field required to construct a domain Job (id, title, url) is
 * missing — mirrors the Adzuna mapper's "skip malformed listings" policy.
 */
export function mapReedResultToListing(result: ReedJobResult): JobProviderListing | null {
  // jobId can legitimately be 0, so this must not be a truthy check.
  const externalId = result.jobId !== undefined ? String(result.jobId) : undefined;
  const title = result.jobTitle?.trim();
  const url = result.jobUrl?.trim();

  if (!externalId || !title || !url) {
    return null;
  }

  const location = mapLocation(result);
  const companyName = result.employerName?.trim() || "Unknown Company";
  const hasSalary =
    typeof result.minimumSalary === "number" && typeof result.maximumSalary === "number";

  return {
    provider: "REED",
    externalId,
    // Same normalized-name placeholder companyId approach as the Adzuna
    // adapter — see adzuna-mapper.ts for the rationale (no
    // CompanyRepository yet).
    companyId: normalizeCompanyName(companyName),
    title,
    description: result.jobDescription?.trim() ?? "",
    url,
    location,
    postedAt: parseReedDate(result.date),
    salaryMin: hasSalary ? result.minimumSalary : undefined,
    salaryMax: hasSalary ? result.maximumSalary : undefined,
    // Unlike Adzuna, Reed returns currency directly — used when present,
    // falling back to GBP (the API is UK-only) rather than inferred from config.
    salaryCurrency: hasSalary ? result.currency?.trim() || DEFAULT_CURRENCY : undefined,
    employmentType: mapEmploymentType(result),
    workMode: mapWorkMode(location),
  };
}
