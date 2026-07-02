import { randomUUID } from "node:crypto";
import { JobNotFoundError } from "@/application/errors/application-errors";
import { SavedJobRecord } from "@/application/dto/saved-job.dto";
import { JobRepository } from "@/application/ports/job-repository.port";
import { SavedJobRepository } from "@/application/ports/saved-job-repository.port";

export interface SaveJobInput {
  userId: string;
  jobId: string;
  notes?: string;
}

/**
 * Idempotent: saving an already-saved job updates notes but preserves the
 * original savedAt; saving a previously dismissed job flips it back to
 * SAVED — a user explicitly re-saving should un-dismiss it.
 */
export class SaveJobUseCase {
  constructor(
    private readonly savedJobRepository: SavedJobRepository,
    private readonly jobRepository: JobRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: SaveJobInput): Promise<SavedJobRecord> {
    const job = await this.jobRepository.findById(input.jobId);
    if (!job) {
      throw new JobNotFoundError(input.jobId);
    }

    const existing = await this.savedJobRepository.findByUserAndJob(input.userId, input.jobId);

    const record: SavedJobRecord = {
      id: existing?.id ?? randomUUID(),
      userId: input.userId,
      jobId: input.jobId,
      status: "SAVED",
      savedAt: existing?.savedAt ?? this.now(),
      notes: input.notes ?? existing?.notes,
    };

    await this.savedJobRepository.save(record);
    return record;
  }
}
