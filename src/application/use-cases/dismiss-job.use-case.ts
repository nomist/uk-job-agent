import { randomUUID } from "node:crypto";
import { JobNotFoundError } from "@/application/errors/application-errors";
import { SavedJobRecord } from "@/application/dto/saved-job.dto";
import { JobRepository } from "@/application/ports/job-repository.port";
import { SavedJobRepository } from "@/application/ports/saved-job-repository.port";

export interface DismissJobInput {
  userId: string;
  jobId: string;
}

/** "Not interested, don't show again" — the permanent counterpart to SaveJobUseCase. */
export class DismissJobUseCase {
  constructor(
    private readonly savedJobRepository: SavedJobRepository,
    private readonly jobRepository: JobRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: DismissJobInput): Promise<SavedJobRecord> {
    const job = await this.jobRepository.findById(input.jobId);
    if (!job) {
      throw new JobNotFoundError(input.jobId);
    }

    const existing = await this.savedJobRepository.findByUserAndJob(input.userId, input.jobId);

    const record: SavedJobRecord = {
      id: existing?.id ?? randomUUID(),
      userId: input.userId,
      jobId: input.jobId,
      status: "DISMISSED",
      savedAt: existing?.savedAt ?? this.now(),
      notes: existing?.notes,
    };

    await this.savedJobRepository.save(record);
    return record;
  }
}
