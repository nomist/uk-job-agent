import { randomUUID } from "node:crypto";
import { Profile } from "@/domain/entities/profile";
import { SalaryRange } from "@/domain/value-objects/salary-range";
import { VisaStatus } from "@/domain/value-objects/visa-status";
import { WorkMode } from "@/domain/value-objects/work-mode";
import { ProfileRepository } from "@/application/ports/profile-repository.port";

export interface UpsertProfileInput {
  userId: string;
  headline?: string;
  yearsOfExperience?: number;
  skills?: string[];
  salaryExpectation?: { min: number; max: number; currency: string };
  preferredLocations?: string[];
  workPreferences?: WorkMode[];
  visaStatus?: VisaStatus;
}

/**
 * Creates the user's Profile if none exists yet, or replaces it in place
 * (same id) otherwise — Profile has no meaningful change history (unlike
 * Application), so a full-field upsert is equivalent to "editing" it. This
 * also naturally supersedes any placeholder Profile created by
 * ensure-default-resume.ts (same deterministic id), turning it into the
 * user's real profile the first time they save the Profile form.
 */
export class UpsertProfileUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: UpsertProfileInput): Promise<Profile> {
    const existing = await this.profileRepository.findByUserId(input.userId);

    const profile = Profile.create({
      id: existing?.id ?? randomUUID(),
      userId: input.userId,
      headline: input.headline,
      yearsOfExperience: input.yearsOfExperience,
      skills: input.skills,
      preferredLocations: input.preferredLocations,
      workPreferences: input.workPreferences,
      visaStatus: input.visaStatus,
      salaryExpectation: input.salaryExpectation
        ? SalaryRange.create(input.salaryExpectation)
        : undefined,
      updatedAt: this.now(),
    });

    await this.profileRepository.save(profile);
    return profile;
  }
}
