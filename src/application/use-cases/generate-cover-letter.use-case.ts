import { CoverLetterTone } from "@/application/dto/ai-provider.dto";
import {
  JobNotFoundError,
  ProfileNotFoundError,
  ResumeNotFoundError,
} from "@/application/errors/application-errors";
import { AiProvider } from "@/application/ports/ai-provider.port";
import { JobRepository } from "@/application/ports/job-repository.port";
import { ProfileRepository } from "@/application/ports/profile-repository.port";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export interface GenerateCoverLetterInput {
  jobId: string;
  profileId: string;
  /** Falls back to the profile's primary resume when omitted. */
  resumeId?: string;
  tone?: CoverLetterTone;
}

export interface GenerateCoverLetterResult {
  content: string;
  modelVersion: string;
  generatedAt: Date;
}

/**
 * Returns generated content but does not persist it — no
 * CoverLetterRepository is in scope this milestone (matches the "compute,
 * don't persist" shape of ScoreJobMatchUseCase and
 * SuggestCVImprovementsUseCase).
 */
export class GenerateCoverLetterUseCase {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly aiProvider: AiProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: GenerateCoverLetterInput): Promise<GenerateCoverLetterResult> {
    const job = await this.jobRepository.findById(input.jobId);
    if (!job) throw new JobNotFoundError(input.jobId);

    const profile = await this.profileRepository.findById(input.profileId);
    if (!profile) throw new ProfileNotFoundError(input.profileId);

    const resume = input.resumeId
      ? await this.resumeRepository.findById(input.resumeId)
      : await this.resumeRepository.findPrimaryByProfileId(input.profileId);
    if (!resume) {
      throw new ResumeNotFoundError(
        input.resumeId ?? `primary resume for profile ${input.profileId}`,
      );
    }

    const result = await this.aiProvider.generateCoverLetter({
      job,
      profile,
      resume,
      tone: input.tone,
    });

    return { content: result.content, modelVersion: result.modelVersion, generatedAt: this.now() };
  }
}
