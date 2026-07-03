import { RecommendationRun } from "@/domain/entities/recommendation-run";
import {
  RecentRecommendationScore,
  RecommendationRunRepository,
} from "@/application/ports/recommendation-run-repository.port";

export class InMemoryRecommendationRunRepository implements RecommendationRunRepository {
  private readonly runs: RecommendationRun[] = [];

  async findLatestByProfileId(profileId: string): Promise<RecommendationRun | null> {
    const matches = this.runs
      .filter((run) => run.profileId === profileId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return matches[0] ?? null;
  }

  async save(run: RecommendationRun): Promise<void> {
    this.runs.push(run);
  }

  async findRecentScores(
    profileId: string,
    resumeId: string,
    jobIds: readonly string[],
    sinceDate: Date,
  ): Promise<Map<string, RecentRecommendationScore>> {
    const jobIdSet = new Set(jobIds);
    const candidates = this.runs
      .filter((run) => run.profileId === profileId && run.resumeId === resumeId)
      .filter((run) => run.createdAt.getTime() >= sinceDate.getTime())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const result = new Map<string, RecentRecommendationScore>();
    for (const run of candidates) {
      for (const item of run.items) {
        if (!jobIdSet.has(item.jobId) || result.has(item.jobId)) continue;
        result.set(item.jobId, {
          jobId: item.jobId,
          score: item.score,
          reason: item.reason,
          missingSkills: [...item.missingSkills],
          scoredAt: run.createdAt,
        });
      }
    }
    return result;
  }

  seed(run: RecommendationRun): void {
    this.runs.push(run);
  }

  all(): RecommendationRun[] {
    return [...this.runs];
  }
}
