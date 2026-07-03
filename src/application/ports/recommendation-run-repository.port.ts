import { RecommendationRun } from "@/domain/entities/recommendation-run";

export interface RecentRecommendationScore {
  jobId: string;
  score: number;
  reason: string;
  missingSkills: string[];
  scoredAt: Date;
}

export interface RecommendationRunRepository {
  findLatestByProfileId(profileId: string): Promise<RecommendationRun | null>;
  save(run: RecommendationRun): Promise<void>;
  /**
   * Most recent score (if any, and if scored on/after `sinceDate`) for each
   * of `jobIds`, for this exact (profileId, resumeId) pair — backs the
   * "never rescore a job if it already has a recent score" cost control.
   * Keyed by jobId; jobs with no qualifying prior score are simply absent.
   */
  findRecentScores(
    profileId: string,
    resumeId: string,
    jobIds: readonly string[],
    sinceDate: Date,
  ): Promise<Map<string, RecentRecommendationScore>>;
}
