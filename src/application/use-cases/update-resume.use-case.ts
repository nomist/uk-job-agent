import { Resume } from "@/domain/entities/resume";
import { ResumeNotFoundError } from "@/application/errors/application-errors";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export interface UpdateResumeInput {
  resumeId: string;
  label?: string;
  content?: string;
  parsedSkills?: string[];
}

/**
 * In-place content edit of an existing Resume row — a genuinely different
 * flow from CreateResumeUseCase (which always makes a new resume). Does not
 * touch the primary flag: promoting a resume to primary stays
 * SetPrimaryResumeUseCase's job (PATCH /api/resumes/:id/primary), so there's
 * exactly one code path that keeps "at most one primary per profile" true.
 */
export class UpdateResumeUseCase {
  constructor(private readonly resumeRepository: ResumeRepository) {}

  async execute(input: UpdateResumeInput): Promise<Resume> {
    const existing = await this.resumeRepository.findById(input.resumeId);
    if (!existing) throw new ResumeNotFoundError(input.resumeId);

    const updated = Resume.create({
      id: existing.id,
      profileId: existing.profileId,
      label: input.label ?? existing.label,
      content: input.content ?? existing.content,
      parsedSkills: input.parsedSkills ?? [...existing.parsedSkills],
      isPrimary: existing.isPrimary,
      createdAt: existing.createdAt,
    });

    await this.resumeRepository.save(updated);
    return updated;
  }
}
