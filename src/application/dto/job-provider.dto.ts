import { EmploymentType } from "@/domain/value-objects/employment-type";
import { WorkMode } from "@/domain/value-objects/work-mode";

export interface JobProviderSearchParams {
  keywords?: string;
  location?: string;
  salaryMin?: number;
  postedWithinDays?: number;
}

export interface JobProviderListingLocation {
  city?: string;
  region?: string;
  country: string;
  isRemote: boolean;
}

/**
 * A normalized listing as returned by a job-provider adapter (Adzuna, Reed,
 * ...). `companyId` is assumed pre-resolved by the adapter — company
 * lookup/dedup logic is an infrastructure concern for a later milestone,
 * since no CompanyRepository is in scope here.
 */
export interface JobProviderListing {
  provider: string;
  externalId: string;
  companyId: string;
  title: string;
  description: string;
  url: string;
  location: JobProviderListingLocation;
  postedAt?: Date;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  employmentType?: EmploymentType;
  workMode?: WorkMode;
}
