import { Job } from "@/domain/entities/job";
import { JobRepository } from "@/application/ports/job-repository.port";

export class InMemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, Job>();

  async findById(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  async findByProviderListing(provider: string, externalId: string): Promise<Job | null> {
    for (const job of this.jobs.values()) {
      if (job.provider === provider && job.externalId === externalId) return job;
    }
    return null;
  }

  async save(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async saveMany(jobs: Job[]): Promise<void> {
    for (const job of jobs) {
      await this.save(job);
    }
  }

  seed(job: Job): void {
    this.jobs.set(job.id, job);
  }
}
