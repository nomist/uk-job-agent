import { Job } from "@/domain/entities/job";

export interface JobRepository {
  findById(id: string): Promise<Job | null>;
  findByProviderListing(provider: string, externalId: string): Promise<Job | null>;
  save(job: Job): Promise<void>;
  saveMany(jobs: Job[]): Promise<void>;
}
