import { JobProviderListing, JobProviderSearchParams } from "@/application/dto/job-provider.dto";
import { JobProvider } from "@/application/ports/job-provider.port";
import { AdzunaConfig, loadAdzunaConfig } from "./adzuna-config";
import { AdzunaRateLimitError, AdzunaRequestError } from "./adzuna-errors";
import { mapAdzunaResultToListing } from "./adzuna-mapper";
import { AdzunaApiResponse } from "./adzuna-types";

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";
const RESULTS_PER_PAGE = 20;
const SEARCH_PAGE = 1;

export class AdzunaJobProvider implements JobProvider {
  readonly name = "ADZUNA";

  constructor(
    private readonly config: AdzunaConfig = loadAdzunaConfig(),
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async search(params: JobProviderSearchParams): Promise<JobProviderListing[]> {
    const url = this.buildUrl(params);

    let response: Response;
    try {
      response = await this.fetchImpl(url);
    } catch (error) {
      throw new AdzunaRequestError(`Failed to reach Adzuna: ${(error as Error).message}`, error);
    }

    if (response.status === 429) {
      throw new AdzunaRateLimitError(
        "Adzuna is rate-limiting requests right now",
        parseRetryAfter(response),
      );
    }

    if (!response.ok) {
      throw new AdzunaRequestError(
        `Adzuna responded with ${response.status} ${response.statusText}`,
      );
    }

    let body: AdzunaApiResponse;
    try {
      body = (await response.json()) as AdzunaApiResponse;
    } catch (error) {
      throw new AdzunaRequestError("Adzuna returned an invalid JSON response", error);
    }

    return (body.results ?? [])
      .map((result) => mapAdzunaResultToListing(result, this.config))
      .filter((listing): listing is JobProviderListing => listing !== null);
  }

  private buildUrl(params: JobProviderSearchParams): string {
    const url = new URL(`${ADZUNA_BASE_URL}/${this.config.country}/search/${SEARCH_PAGE}`);
    url.searchParams.set("app_id", this.config.appId);
    url.searchParams.set("app_key", this.config.appKey);
    url.searchParams.set("results_per_page", String(RESULTS_PER_PAGE));
    url.searchParams.set("content-type", "application/json");

    if (params.keywords) url.searchParams.set("what", params.keywords);
    if (params.location) url.searchParams.set("where", params.location);
    if (params.salaryMin !== undefined) {
      url.searchParams.set("salary_min", String(params.salaryMin));
    }
    if (params.postedWithinDays !== undefined) {
      url.searchParams.set("max_days_old", String(params.postedWithinDays));
    }

    return url.toString();
  }
}

function parseRetryAfter(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : undefined;
}
