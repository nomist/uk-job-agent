import { randomUUID } from "node:crypto";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { ProfileRepository } from "@/application/ports/profile-repository.port";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export interface CreateResumeInput {
  userId: string;
  label: string;
  content: string;
  /** Defaults to true for a user's first resume, false otherwise. */
  isPrimary?: boolean;
}

/**
 * Always creates a new Resume "version" (Resume has no update-content
 * method by design — see resume.ts), auto-creating a minimal Profile first
 * if the user doesn't have one yet, so uploading a resume is never blocked
 * on filling in the Profile form first.
 */
export class CreateResumeUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateResumeInput): Promise<Resume> {
    let profile = await this.profileRepository.findByUserId(input.userId);
    if (!profile) {
      profile = Profile.create({ id: randomUUID(), userId: input.userId, updatedAt: this.now() });
      await this.profileRepository.save(profile);
    }

    const existingPrimary = await this.resumeRepository.findPrimaryByProfileId(profile.id);
    const makePrimary = input.isPrimary ?? !existingPrimary;

    const resume = Resume.create({
      id: randomUUID(),
      profileId: profile.id,
      label: input.label,
      content: input.content,
      isPrimary: makePrimary,
      createdAt: this.now(),
    });
    await this.resumeRepository.save(resume);

    if (makePrimary && existingPrimary && existingPrimary.id !== resume.id) {
      await this.resumeRepository.save(existingPrimary.unmarkAsPrimary());
    }

    return resume;
  }
}
