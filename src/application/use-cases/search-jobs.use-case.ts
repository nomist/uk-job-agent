import { randomUUID } from "node:crypto";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { SalaryRange } from "@/domain/value-objects/salary-range";
import { JobProviderListing, JobProviderSearchParams } from "@/application/dto/job-provider.dto";
import { JobProvider } from "@/application/ports/job-provider.port";
import { JobRepository } from "@/application/ports/job-repository.port";

export type SearchJobsInput = JobProviderSearchParams;

export interface SearchJobsResult {
  jobs: Job[];
  totalListingsFound: number;
  /**
   * Names of configured providers whose search() call failed this
   * request (e.g. rate-limited, network error). A provider appearing here
   * doesn't mean the search failed overall — results from the other
   * provider(s) are still returned — but the caller (the route/UI) can use
   * this to tell the user their results may be incomplete.
   */
  failedProviders: string[];
}

export class SearchJobsUseCase {
  constructor(
    private readonly jobProviders: readonly JobProvider[],
    private readonly jobRepository: JobRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: SearchJobsInput): Promise<SearchJobsResult> {
    const settled = await Promise.allSettled(
      this.jobProviders.map((provider) => provider.search(input)),
    );

    const listings: JobProviderListing[] = [];
    const failedProviders: string[] = [];
    settled.forEach((result, index) => {
      if (result.status === "fulfilled") {
        listings.push(...result.value);
      } else {
        failedProviders.push(this.jobProviders[index].name);
      }
    });

    // A provider or two failing (rate limit, transient outage) shouldn't
    // sink a search that other configured providers could still serve.
    // Only surface the failure if *every* configured provider failed —
    // returning an empty, "successful"-looking result in that case would
    // be misleading (indistinguishable from a genuine zero-result search).
    if (this.jobProviders.length > 0 && failedProviders.length === this.jobProviders.length) {
      throw (settled[0] as PromiseRejectedResult).reason;
    }

    const seenAt = this.now();

    const jobs: Job[] = [];
    for (const listing of listings) {
      const existing = await this.jobRepository.findByProviderListing(
        listing.provider,
        listing.externalId,
      );
      jobs.push(existing ? existing.recordSighting(seenAt) : this.toNewJob(listing, seenAt));
    }

    const deduped = this.deduplicate(jobs);
    await this.jobRepository.saveMany(deduped);

    return { jobs: deduped, totalListingsFound: listings.length, failedProviders };
  }

  private toNewJob(listing: JobProviderListing, seenAt: Date): Job {
    const hasSalary =
      listing.salaryMin !== undefined &&
      listing.salaryMax !== undefined &&
      listing.salaryCurrency !== undefined;

    return Job.create({
      id: randomUUID(),
      companyId: listing.companyId,
      provider: listing.provider,
      externalId: listing.externalId,
      title: listing.title,
      description: listing.description,
      url: listing.url,
      location: Location.create(listing.location),
      firstSeenAt: seenAt,
      lastSeenAt: seenAt,
      postedAt: listing.postedAt,
      employmentType: listing.employmentType,
      workMode: listing.workMode,
      salaryRange: hasSalary
        ? SalaryRange.create({
            min: listing.salaryMin!,
            max: listing.salaryMax!,
            currency: listing.salaryCurrency!,
          })
        : undefined,
    });
  }

  /**
   * Cross-provider dedup heuristic (title + company + city), per the
   * Architecture RFC: the first-seen job in a batch becomes canonical and
   * later matches are flagged against it, rather than merged outright.
   */
  private deduplicate(jobs: Job[]): Job[] {
    const seen = new Map<string, Job>();
    const result: Job[] = [];

    for (const job of jobs) {
      const key = this.dedupeKey(job);
      const canonical = seen.get(key);
      if (canonical && canonical.id !== job.id) {
        result.push(job.assignToCanonical(canonical.id));
      } else {
        seen.set(key, job);
        result.push(job);
      }
    }

    return result;
  }

  private dedupeKey(job: Job): string {
    return [
      job.title.trim().toLowerCase(),
      job.companyId,
      job.location.city?.toLowerCase() ?? "",
    ].join("|");
  }
}
