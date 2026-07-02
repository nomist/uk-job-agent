import { JobProviderListing, JobProviderSearchParams } from "@/application/dto/job-provider.dto";
import { JobProvider } from "@/application/ports/job-provider.port";
import { loadReedConfig, ReedConfig } from "./reed-config";
import { ReedRequestError } from "./reed-errors";
import { mapReedResultToListing } from "./reed-mapper";
import { ReedSearchResponse } from "./reed-types";

const REED_SEARCH_URL = "https://www.reed.co.uk/api/1.0/search";
const RESULTS_TO_TAKE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export class ReedJobProvider implements JobProvider {
  readonly name = "REED";

  constructor(
    private readonly config: ReedConfig = loadReedConfig(),
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async search(params: JobProviderSearchParams): Promise<JobProviderListing[]> {
    const url = this.buildUrl(params);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: { Authorization: this.buildAuthHeader() },
      });
    } catch (error) {
      throw new ReedRequestError(`Failed to reach Reed: ${(error as Error).message}`, error);
    }

    if (!response.ok) {
      throw new ReedRequestError(`Reed responded with ${response.status} ${response.statusText}`);
    }

    let body: ReedSearchResponse;
    try {
      body = (await response.json()) as ReedSearchResponse;
    } catch (error) {
      throw new ReedRequestError("Reed returned an invalid JSON response", error);
    }

    const listings = (body.results ?? [])
      .map(mapReedResultToListing)
      .filter((listing): listing is JobProviderListing => listing !== null);

    return this.filterByPostedWithin(listings, params.postedWithinDays);
  }

  /**
   * Reed's search API has no "posted within N days" query param (unlike
   * Adzuna's max_days_old), so this filters client-side using the postedAt
   * date already parsed by the mapper. Listings with no parseable date are
   * kept rather than dropped, since we can't tell whether they qualify.
   */
  private filterByPostedWithin(
    listings: JobProviderListing[],
    postedWithinDays: number | undefined,
  ): JobProviderListing[] {
    if (postedWithinDays === undefined) return listings;

    const cutoff = Date.now() - postedWithinDays * DAY_MS;
    return listings.filter((listing) => !listing.postedAt || listing.postedAt.getTime() >= cutoff);
  }

  private buildAuthHeader(): string {
    // Reed uses HTTP Basic Auth with the API key as username and an empty password.
    const token = Buffer.from(`${this.config.apiKey}:`).toString("base64");
    return `Basic ${token}`;
  }

  private buildUrl(params: JobProviderSearchParams): string {
    const url = new URL(REED_SEARCH_URL);
    url.searchParams.set("resultsToTake", String(RESULTS_TO_TAKE));

    if (params.keywords) url.searchParams.set("keywords", params.keywords);
    if (params.location) url.searchParams.set("locationName", params.location);
    if (params.salaryMin !== undefined) {
      url.searchParams.set("minimumSalary", String(params.salaryMin));
    }

    return url.toString();
  }
}
