import { Resume } from "@/domain/entities/resume";
import { ProfileRepository } from "@/application/ports/profile-repository.port";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export interface ListResumesInput {
  userId: string;
}

/** Returns [] for a user with no profile yet, rather than throwing — an empty Resume Manager is a valid state. */
export class ListResumesUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly resumeRepository: ResumeRepository,
  ) {}

  async execute(input: ListResumesInput): Promise<Resume[]> {
    const profile = await this.profileRepository.findByUserId(input.userId);
    if (!profile) return [];

    return this.resumeRepository.findByProfileId(profile.id);
  }
}
