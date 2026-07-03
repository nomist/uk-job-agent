import { Resume } from "@/domain/entities/resume";
import { ResumeNotFoundError } from "@/application/errors/application-errors";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export interface SetPrimaryResumeInput {
  resumeId: string;
}

/** Demotes whichever resume was previously primary for the same profile, so exactly one stays primary. */
export class SetPrimaryResumeUseCase {
  constructor(private readonly resumeRepository: ResumeRepository) {}

  async execute(input: SetPrimaryResumeInput): Promise<Resume> {
    const resume = await this.resumeRepository.findById(input.resumeId);
    if (!resume) throw new ResumeNotFoundError(input.resumeId);

    if (resume.isPrimary) return resume;

    const currentPrimary = await this.resumeRepository.findPrimaryByProfileId(resume.profileId);
    if (currentPrimary) {
      await this.resumeRepository.save(currentPrimary.unmarkAsPrimary());
    }

    const updated = resume.markAsPrimary();
    await this.resumeRepository.save(updated);
    return updated;
  }
}
