import { SavedJobNotFoundError } from "@/application/errors/application-errors";
import { SavedJobRepository } from "@/application/ports/saved-job-repository.port";

export interface DeleteSavedJobInput {
  savedJobId: string;
}

/**
 * Permanently removes a SavedJob record — distinct from DismissJobUseCase,
 * which flips status to DISMISSED so the job stays excluded from future
 * recommendation runs. Deleting forgets the record entirely: a deleted job
 * is no longer excluded by the recommendations engine, and could be saved
 * fresh again later.
 */
export class DeleteSavedJobUseCase {
  constructor(private readonly savedJobRepository: SavedJobRepository) {}

  async execute(input: DeleteSavedJobInput): Promise<void> {
    const record = await this.savedJobRepository.findById(input.savedJobId);
    if (!record) throw new SavedJobNotFoundError(input.savedJobId);

    await this.savedJobRepository.delete(record.id);
  }
}
