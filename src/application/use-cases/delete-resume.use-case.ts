import {
  CannotDeleteOnlyResumeError,
  ResumeNotFoundError,
} from "@/application/errors/application-errors";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export interface DeleteResumeInput {
  resumeId: string;
}

/**
 * A profile must always keep at least one resume — Match Score, Cover
 * Letter, CV Suggestions, and Recommendations all require a primary resume
 * to function — so deleting a profile's only resume is rejected outright.
 * Deleting the primary resume when others remain reassigns primary to the
 * most recently added survivor, rather than leaving the profile with no
 * primary resume at all.
 */
export class DeleteResumeUseCase {
  constructor(private readonly resumeRepository: ResumeRepository) {}

  async execute(input: DeleteResumeInput): Promise<void> {
    const resume = await this.resumeRepository.findById(input.resumeId);
    if (!resume) throw new ResumeNotFoundError(input.resumeId);

    const siblings = await this.resumeRepository.findByProfileId(resume.profileId);
    if (siblings.length <= 1) {
      throw new CannotDeleteOnlyResumeError(input.resumeId);
    }

    await this.resumeRepository.delete(resume.id);

    if (resume.isPrimary) {
      const remaining = siblings.filter((sibling) => sibling.id !== resume.id);
      const nextPrimary = [...remaining].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];
      if (nextPrimary) {
        await this.resumeRepository.save(nextPrimary.markAsPrimary());
      }
    }
  }
}
