import { Job } from "@/domain/entities/job";
import { Profile } from "@/domain/entities/profile";
import { RecommendationRun } from "@/domain/entities/recommendation-run";
import { Resume } from "@/domain/entities/resume";
import { JobRepository } from "@/application/ports/job-repository.port";
import { ProfileRepository } from "@/application/ports/profile-repository.port";
import { RecommendationRunRepository } from "@/application/ports/recommendation-run-repository.port";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export interface DashboardRecommendationsResult {
  profile: Profile | null;
  /** Non-null only once `profile` is also non-null. */
  primaryResume: Resume | null;
  /** Non-null only once both `profile` and `primaryResume` are set. */
  latestRun: RecommendationRun | null;
  /** Full Job details for latestRun.items, keyed by jobId — items only store a snapshot, not the job itself. */
  jobsById: Map<string, Job>;
}

/**
 * Read-only dashboard load: resolves the user's Profile/primary Resume
 * (returning early with nulls if either is missing, so the route can show a
 * setup prompt) and, if both exist, the latest saved RecommendationRun with
 * its jobs hydrated. Never touches AiProvider — loading the dashboard must
 * never spend AI tokens.
 */
export class GetDashboardRecommendationsUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly recommendationRunRepository: RecommendationRunRepository,
    private readonly jobRepository: JobRepository,
  ) {}

  async execute(userId: string): Promise<DashboardRecommendationsResult> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      return { profile: null, primaryResume: null, latestRun: null, jobsById: new Map() };
    }

    const primaryResume = await this.resumeRepository.findPrimaryByProfileId(profile.id);
    if (!primaryResume) {
      return { profile, primaryResume: null, latestRun: null, jobsById: new Map() };
    }

    const latestRun = await this.recommendationRunRepository.findLatestByProfileId(profile.id);
    const jobsById = new Map<string, Job>();
    if (latestRun) {
      for (const item of latestRun.items) {
        const job = await this.jobRepository.findById(item.jobId);
        // A recommended job that's since been deleted shouldn't happen in
        // practice, but skipping it (rather than throwing) keeps one bad
        // reference from breaking the whole dashboard.
        if (job) jobsById.set(item.jobId, job);
      }
    }

    return { profile, primaryResume, latestRun, jobsById };
  }
}
