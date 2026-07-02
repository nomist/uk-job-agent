import { Job } from "@/domain/entities/job";
import { SavedJobRecord } from "@/application/dto/saved-job.dto";
import { JobRepository } from "@/application/ports/job-repository.port";
import { SavedJobRepository } from "@/application/ports/saved-job-repository.port";

export interface ListSavedJobsInput {
  userId: string;
}

export interface SavedJobWithDetails {
  savedJob: SavedJobRecord;
  job: Job;
}

/**
 * Lists a user's currently-saved (not dismissed) jobs, each enriched with
 * its full Job details — SavedJobRecord only carries a jobId, and the
 * Saved Jobs screen needs title/company/location/salary/etc. to render.
 */
export class ListSavedJobsUseCase {
  constructor(
    private readonly savedJobRepository: SavedJobRepository,
    private readonly jobRepository: JobRepository,
  ) {}

  async execute(input: ListSavedJobsInput): Promise<SavedJobWithDetails[]> {
    const records = await this.savedJobRepository.findByUserId(input.userId);
    const savedOnly = records.filter((record) => record.status === "SAVED");

    const results: SavedJobWithDetails[] = [];
    for (const savedJob of savedOnly) {
      const job = await this.jobRepository.findById(savedJob.jobId);
      // A saved job whose underlying Job record is missing shouldn't
      // happen in practice, but skipping it (rather than throwing) keeps
      // one bad reference from breaking the whole list.
      if (job) {
        results.push({ savedJob, job });
      }
    }

    return results.sort((a, b) => b.savedJob.savedAt.getTime() - a.savedJob.savedAt.getTime());
  }
}
