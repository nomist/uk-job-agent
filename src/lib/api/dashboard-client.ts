import type { ProfileJson, VisaStatusValue, WorkModeValue } from "./profile-client";
import type { JobSearchResult } from "./jobs-client";

// Local, UI-owned types describing the wire JSON returned by
// GET /api/dashboard/recommendations and POST
// /api/dashboard/recommendations/refresh (see src/app/api/_lib/serializers.ts).

export interface RecommendationSearchFiltersJson {
  headline?: string;
  skills: string[];
  locations: string[];
  workModes: WorkModeValue[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  visaStatus: VisaStatusValue;
  yearsOfExperience?: number;
  maxJobsToScore: number;
}

export interface RecommendationItemJson {
  jobId: string;
  score: number;
  reason: string;
  missingSkills: string[];
  job: JobSearchResult;
}

export interface RecommendationRunJson {
  id: string;
  profileId: string;
  resumeId: string;
  createdAt: string;
  searchFilters: RecommendationSearchFiltersJson;
  rawResultCount: number;
  candidateCount: number;
  selectedForScoringCount: number;
  scoredCount: number;
  failedCount: number;
  items: RecommendationItemJson[];
}

export type DashboardStatus = "no_profile" | "no_resume" | "ready";

export interface DashboardRecommendationsResponse {
  status: DashboardStatus;
  profile: ProfileJson | null;
  prefillFilters: RecommendationSearchFiltersJson | null;
  maxJobsToScoreCap: number;
  latestRun: RecommendationRunJson | null;
}

export interface RefreshRecommendationsParams {
  userId: string;
  filters?: Partial<RecommendationSearchFiltersJson>;
  forceRescore?: boolean;
}

/** Thrown when a dashboard API call responds with a non-OK status. */
export class DashboardRequestError extends Error {}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Client-side wrapper around GET /api/dashboard/recommendations — read-only,
 * never triggers AI scoring. Safe to call on page load.
 */
export async function getDashboardRecommendations(
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DashboardRecommendationsResponse> {
  const response = await fetchImpl(
    `/api/dashboard/recommendations?userId=${encodeURIComponent(userId)}`,
  );

  if (!response.ok) {
    throw new DashboardRequestError(
      await readErrorMessage(
        response,
        `Failed to load recommendations (status ${response.status})`,
      ),
    );
  }

  return (await response.json()) as DashboardRecommendationsResponse;
}

/**
 * Client-side wrapper around POST /api/dashboard/recommendations/refresh —
 * the only call in this module that spends AI tokens. Must only ever be
 * invoked from a "Refresh recommendations" button's onClick — see
 * useRefreshRecommendations.
 */
export async function refreshRecommendations(
  params: RefreshRecommendationsParams,
  fetchImpl: typeof fetch = fetch,
): Promise<RecommendationRunJson> {
  const response = await fetchImpl("/api/dashboard/recommendations/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new DashboardRequestError(
      await readErrorMessage(
        response,
        `Failed to refresh recommendations (status ${response.status})`,
      ),
    );
  }

  const body = (await response.json()) as { run: RecommendationRunJson };
  return body.run;
}
