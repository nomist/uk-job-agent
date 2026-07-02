import { randomUUID } from "node:crypto";
import { MatchScore } from "@/domain/entities/match-score";
import { ConfidenceScore } from "@/domain/value-objects/confidence-score";
import {
  JobNotFoundError,
  ProfileNotFoundError,
  ResumeNotFoundError,
} from "@/application/errors/application-errors";
import { AiProvider } from "@/application/ports/ai-provider.port";
import { JobRepository } from "@/application/ports/job-repository.port";
import { ProfileRepository } from "@/application/ports/profile-repository.port";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export interface ScoreJobMatchInput {
  jobId: string;
  profileId: string;
  /** Falls back to the profile's primary resume when omitted. */
  resumeId?: string;
}

/**
 * Computes and returns a MatchScore but does not persist it — no
 * MatchScoreRepository is in scope this milestone, so caching/history
 * (the `isLatest` supersession flow) is deferred to a later milestone.
 */
export class ScoreJobMatchUseCase {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly aiProvider: AiProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: ScoreJobMatchInput): Promise<MatchScore> {
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

    const result = await this.aiProvider.scoreMatch({ job, profile, resume });

    return MatchScore.create({
      id: randomUUID(),
      jobId: job.id,
      profileId: profile.id,
      resumeId: resume.id,
      score: result.score,
      confidence: ConfidenceScore.create(result.confidence),
      rationale: result.rationale,
      missingSkills: result.missingSkills,
      modelVersion: result.modelVersion,
      generatedAt: this.now(),
    });
  }
}
