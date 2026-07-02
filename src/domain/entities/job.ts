import { InvalidJobError } from "@/domain/errors/domain-errors";
import { EmploymentType } from "@/domain/value-objects/employment-type";
import { Location } from "@/domain/value-objects/location";
import { SalaryRange } from "@/domain/value-objects/salary-range";
import { WorkMode } from "@/domain/value-objects/work-mode";

export interface JobProps {
  id: string;
  companyId: string;
  provider: string;
  externalId: string;
  title: string;
  description: string;
  location: Location;
  url: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  salaryRange?: SalaryRange;
  employmentType?: EmploymentType;
  workMode?: WorkMode;
  postedAt?: Date;
  isExpired?: boolean;
  canonicalJobId?: string;
}

const URL_PATTERN = /^https?:\/\//i;

/**
 * `provider` is a plain identifier (e.g. "ADZUNA") rather than a reference
 * to a JobProvider entity — JobProvider isn't in scope for this milestone,
 * and Job's public shape shouldn't need to change when it's introduced.
 */
export class Job {
  private constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly provider: string,
    public readonly externalId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly location: Location,
    public readonly url: string,
    public readonly firstSeenAt: Date,
    public readonly lastSeenAt: Date,
    public readonly isExpired: boolean,
    public readonly salaryRange?: SalaryRange,
    public readonly employmentType?: EmploymentType,
    public readonly workMode?: WorkMode,
    public readonly postedAt?: Date,
    public readonly canonicalJobId?: string,
  ) {}

  static create(props: JobProps): Job {
    const id = props.id.trim();
    const companyId = props.companyId.trim();
    const provider = props.provider.trim();
    const externalId = props.externalId.trim();
    const title = props.title.trim();
    const url = props.url.trim();

    if (id.length === 0) throw new InvalidJobError("Job id must not be empty");
    if (companyId.length === 0) throw new InvalidJobError("Job companyId must not be empty");
    if (provider.length === 0) throw new InvalidJobError("Job provider must not be empty");
    if (externalId.length === 0) throw new InvalidJobError("Job externalId must not be empty");
    if (title.length === 0) throw new InvalidJobError("Job title must not be empty");
    if (!URL_PATTERN.test(url)) {
      throw new InvalidJobError(`Job url must be an absolute http(s) URL, got "${url}"`);
    }
    if (props.lastSeenAt.getTime() < props.firstSeenAt.getTime()) {
      throw new InvalidJobError("Job lastSeenAt cannot be before firstSeenAt");
    }
    if (props.canonicalJobId?.trim() === id) {
      throw new InvalidJobError("Job cannot be its own canonical duplicate");
    }

    return new Job(
      id,
      companyId,
      provider,
      externalId,
      title,
      props.description.trim(),
      props.location,
      url,
      props.firstSeenAt,
      props.lastSeenAt,
      props.isExpired ?? false,
      props.salaryRange,
      props.employmentType,
      props.workMode,
      props.postedAt,
      props.canonicalJobId?.trim() || undefined,
    );
  }

  /** Job reappeared in a search result: bump lastSeenAt and un-expire it. */
  recordSighting(seenAt: Date): Job {
    if (seenAt.getTime() < this.firstSeenAt.getTime()) {
      throw new InvalidJobError("Sighting cannot be before firstSeenAt");
    }
    return new Job(
      this.id,
      this.companyId,
      this.provider,
      this.externalId,
      this.title,
      this.description,
      this.location,
      this.url,
      this.firstSeenAt,
      seenAt,
      false,
      this.salaryRange,
      this.employmentType,
      this.workMode,
      this.postedAt,
      this.canonicalJobId,
    );
  }

  markExpired(): Job {
    return new Job(
      this.id,
      this.companyId,
      this.provider,
      this.externalId,
      this.title,
      this.description,
      this.location,
      this.url,
      this.firstSeenAt,
      this.lastSeenAt,
      true,
      this.salaryRange,
      this.employmentType,
      this.workMode,
      this.postedAt,
      this.canonicalJobId,
    );
  }

  assignToCanonical(canonicalJobId: string): Job {
    const trimmed = canonicalJobId.trim();
    if (trimmed.length === 0) {
      throw new InvalidJobError("canonicalJobId must not be empty");
    }
    if (trimmed === this.id) {
      throw new InvalidJobError("Job cannot be its own canonical duplicate");
    }
    return new Job(
      this.id,
      this.companyId,
      this.provider,
      this.externalId,
      this.title,
      this.description,
      this.location,
      this.url,
      this.firstSeenAt,
      this.lastSeenAt,
      this.isExpired,
      this.salaryRange,
      this.employmentType,
      this.workMode,
      this.postedAt,
      trimmed,
    );
  }

  /** True if `this` and `other` originate from the same provider listing. */
  isSameProviderListing(other: Job): boolean {
    return this.provider === other.provider && this.externalId === other.externalId;
  }
}
