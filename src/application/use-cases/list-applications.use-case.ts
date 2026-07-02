import { Application } from "@/domain/entities/application";
import { Job } from "@/domain/entities/job";
import { ApplicationRepository } from "@/application/ports/application-repository.port";
import { JobRepository } from "@/application/ports/job-repository.port";

export interface ListApplicationsInput {
  userId: string;
}

export interface ApplicationWithDetails {
  application: Application;
  job: Job;
}

/**
 * Lists all of a user's applications (every status — the Applications
 * screen groups by status itself, so nothing is filtered out here), each
 * enriched with its full Job details for display.
 */
export class ListApplicationsUseCase {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly jobRepository: JobRepository,
  ) {}

  async execute(input: ListApplicationsInput): Promise<ApplicationWithDetails[]> {
    const applications = await this.applicationRepository.findByUserId(input.userId);

    const results: ApplicationWithDetails[] = [];
    for (const application of applications) {
      const job = await this.jobRepository.findById(application.jobId);
      // An application whose underlying Job record is missing shouldn't
      // happen in practice, but skipping it (rather than throwing) keeps
      // one bad reference from breaking the whole list.
      if (job) {
        results.push({ application, job });
      }
    }

    return results.sort(
      (a, b) => b.application.appliedAt.getTime() - a.application.appliedAt.getTime(),
    );
  }
}
