import { RecommendationSearchFilters } from "@/domain/entities/recommendation-run";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { JobProviderSearchParams } from "@/application/dto/job-provider.dto";

/**
 * Hard ceiling on how many jobs a single recommendation run will send to AI
 * scoring — never exceeded regardless of what a caller-supplied override
 * requests. This is the cost-control backbone of Milestone 8.2: AI tokens
 * are only ever spent on a manually-triggered, capped batch.
 */
export const RECOMMENDATION_MAX_JOBS_TO_SCORE_CAP = 20;
const DEFAULT_MAX_JOBS_TO_SCORE = 20;

/** Provider search queries are built from at most this many preferred locations, to bound real API call volume per refresh. */
const MAX_LOCATION_QUERIES = 3;
const MAX_KEYWORD_SKILLS = 3;

export type RecommendationSearchFiltersOverrides = Partial<RecommendationSearchFilters>;

/**
 * Prefills recommendation settings from the Profile and primary Resume, so
 * the user never has to retype the same search — any field the user has
 * adjusted (`overrides`) wins over the Profile-derived default.
 */
export function buildRecommendationSearchFilters(
  profile: Profile,
  resume: Resume,
  overrides: RecommendationSearchFiltersOverrides = {},
): RecommendationSearchFilters {
  const requestedMax = overrides.maxJobsToScore ?? DEFAULT_MAX_JOBS_TO_SCORE;

  return {
    headline: overrides.headline ?? profile.headline,
    skills: overrides.skills ?? mergeSkills(profile.skills, resume.parsedSkills),
    locations: overrides.locations ?? [...profile.preferredLocations],
    workModes: overrides.workModes ?? [...profile.workPreferences],
    salaryMin: overrides.salaryMin ?? profile.salaryExpectation?.min,
    salaryMax: overrides.salaryMax ?? profile.salaryExpectation?.max,
    salaryCurrency: overrides.salaryCurrency ?? profile.salaryExpectation?.currency,
    visaStatus: overrides.visaStatus ?? profile.visaStatus,
    yearsOfExperience: overrides.yearsOfExperience ?? profile.yearsOfExperience,
    maxJobsToScore: Math.max(1, Math.min(requestedMax, RECOMMENDATION_MAX_JOBS_TO_SCORE_CAP)),
  };
}

/**
 * One query per preferred location (capped, to bound real provider API call
 * volume), or a single broad query when no location is set — "one or more
 * job search queries" per the Milestone 8.2 spec.
 */
export function buildProviderSearchQueries(
  filters: RecommendationSearchFilters,
): JobProviderSearchParams[] {
  const keywords = buildKeywords(filters);
  const locations = filters.locations.slice(0, MAX_LOCATION_QUERIES);

  if (locations.length === 0) {
    return [{ keywords, salaryMin: filters.salaryMin }];
  }

  return locations.map((location) => ({ keywords, location, salaryMin: filters.salaryMin }));
}

function buildKeywords(filters: RecommendationSearchFilters): string | undefined {
  if (filters.headline) return filters.headline;
  if (filters.skills.length > 0) return filters.skills.slice(0, MAX_KEYWORD_SKILLS).join(" ");
  return undefined;
}

function mergeSkills(profileSkills: readonly string[], resumeSkills: readonly string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const skill of [...profileSkills, ...resumeSkills]) {
    const key = skill.trim().toLowerCase();
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    merged.push(skill.trim());
  }
  return merged;
}
