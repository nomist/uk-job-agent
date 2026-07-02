// Local, UI-owned types describing the wire JSON returned by GET /api/jobs
// (see src/app/api/_lib/serializers.ts) — deliberately not the domain Job
// entity (dates are strings here, not Date objects; there are no methods).

export interface JobSearchResultLocation {
  city: string | null;
  region: string | null;
  country: string;
  isRemote: boolean;
}

export interface JobSearchResultSalary {
  min: number;
  max: number;
  currency: string;
}

export interface JobSearchResult {
  id: string;
  companyId: string;
  provider: string;
  externalId: string;
  title: string;
  description: string;
  location: JobSearchResultLocation;
  url: string;
  salaryRange: JobSearchResultSalary | null;
  employmentType: string | null;
  workMode: string | null;
  postedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isExpired: boolean;
  canonicalJobId: string | null;
}

export interface JobSearchResponse {
  jobs: JobSearchResult[];
  totalListingsFound: number;
  /**
   * True when results came from the development-only MockJobProvider
   * fallback (no real job-provider credentials configured) — see
   * resolveDefaultJobProviders() in src/lib/di/container.ts. Always false
   * in production.
   */
  isMock: boolean;
}

export interface JobSearchParams {
  q?: string;
  location?: string;
  salaryMin?: number;
  remoteOnly?: boolean;
  provider?: string;
}

/** Thrown when GET /api/jobs responds with a non-OK status. */
export class JobSearchRequestError extends Error {}

function buildSearchParams(params: JobSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.location) searchParams.set("location", params.location);
  if (params.salaryMin !== undefined) searchParams.set("salaryMin", String(params.salaryMin));
  if (params.remoteOnly) searchParams.set("remoteOnly", "true");
  if (params.provider) searchParams.set("provider", params.provider);
  return searchParams;
}

/**
 * Client-side wrapper around GET /api/jobs — the only HTTP call this UI
 * ever makes. Never calls Adzuna/Reed, Prisma, or any other infrastructure
 * code directly.
 */
export async function searchJobs(
  params: JobSearchParams,
  fetchImpl: typeof fetch = fetch,
): Promise<JobSearchResponse> {
  const query = buildSearchParams(params).toString();
  const response = await fetchImpl(`/api/jobs${query ? `?${query}` : ""}`);

  if (!response.ok) {
    let message = `Job search failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) message = body.error.message;
    } catch {
      // Response body wasn't JSON — fall back to the generic message above.
    }
    throw new JobSearchRequestError(message);
  }

  return (await response.json()) as JobSearchResponse;
}
