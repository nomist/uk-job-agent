import { JobProviderListing, JobProviderSearchParams } from "@/application/dto/job-provider.dto";

export interface JobProvider {
  readonly name: string;
  search(params: JobProviderSearchParams): Promise<JobProviderListing[]>;
}
