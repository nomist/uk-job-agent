import { normalizeCompanyName } from "@/domain/entities/company";
import { EmploymentType } from "@/domain/value-objects/employment-type";
import { WorkMode } from "@/domain/value-objects/work-mode";
import { JobProviderListing, JobProviderListingLocation } from "@/application/dto/job-provider.dto";
import { AdzunaConfig } from "./adzuna-config";
import { AdzunaJobResult } from "./adzuna-types";

const COUNTRY_CURRENCY: Record<string, string> = {
  gb: "GBP",
};

function inferCountryLabel(country: string, area: string[] | undefined): string {
  if (area && area.length > 0) return area[0];
  return country.toLowerCase() === "gb" ? "UK" : country.toUpperCase();
}

// Adzuna has no explicit "remote" field — this heuristically checks the
// location display name and title for the word "remote", which will both
// under- and over-count true remote roles.
function inferIsRemote(locationDisplayName: string | undefined, title: string): boolean {
  return /remote/i.test(locationDisplayName ?? "") || /remote/i.test(title);
}

function mapLocation(result: AdzunaJobResult, config: AdzunaConfig): JobProviderListingLocation {
  const area = result.location?.area;
  const displayName = result.location?.display_name;

  return {
    country: inferCountryLabel(config.country, area),
    city: displayName,
    // area is a hierarchy from country down to the most specific place
    // (e.g. ["UK", "England", "Greater London", "London"]); area[1] is
    // treated as a coarse "region" when the hierarchy is deep enough to
    // have one distinct from the city itself.
    region: area && area.length > 2 ? area[1] : undefined,
    isRemote: inferIsRemote(displayName, result.title ?? ""),
  };
}

// Adzuna's contract_type/contract_time don't map 1:1 onto EmploymentType
// (no TEMPORARY/INTERNSHIP signal at all) — best-effort, undefined when
// ambiguous rather than guessed.
function mapEmploymentType(result: AdzunaJobResult): EmploymentType | undefined {
  if (result.contract_type === "contract") return "CONTRACT";
  if (result.contract_time === "part_time") return "PART_TIME";
  if (result.contract_time === "full_time") return "FULL_TIME";
  return undefined;
}

// Adzuna gives no hybrid/onsite signal, so workMode is only ever REMOTE or unset.
function mapWorkMode(location: JobProviderListingLocation): WorkMode | undefined {
  return location.isRemote ? "REMOTE" : undefined;
}

/**
 * Maps one raw Adzuna result to a normalized JobProviderListing, or returns
 * null when a field required to construct a domain Job (id, title, url) is
 * missing — malformed individual listings are skipped rather than crashing
 * the whole search.
 */
export function mapAdzunaResultToListing(
  result: AdzunaJobResult,
  config: AdzunaConfig,
): JobProviderListing | null {
  const externalId = result.id?.trim();
  const title = result.title?.trim();
  const url = result.redirect_url?.trim();

  if (!externalId || !title || !url) {
    return null;
  }

  const location = mapLocation(result, config);
  const companyName = result.company?.display_name?.trim() || "Unknown Company";
  const hasSalary = typeof result.salary_min === "number" && typeof result.salary_max === "number";

  return {
    provider: "ADZUNA",
    externalId,
    // No CompanyRepository exists yet (out of scope for this milestone).
    // This is a stable, normalized placeholder key — not a real database
    // id — so the same company always maps to the same companyId. A future
    // milestone that adds company resolution can look up-or-create a
    // Company row keyed by this same normalized name.
    companyId: normalizeCompanyName(companyName),
    title,
    description: result.description?.trim() ?? "",
    url,
    location,
    postedAt: result.created ? new Date(result.created) : undefined,
    salaryMin: hasSalary ? result.salary_min : undefined,
    salaryMax: hasSalary ? result.salary_max : undefined,
    salaryCurrency: hasSalary
      ? (COUNTRY_CURRENCY[config.country.toLowerCase()] ?? "GBP")
      : undefined,
    employmentType: mapEmploymentType(result),
    workMode: mapWorkMode(location),
  };
}
