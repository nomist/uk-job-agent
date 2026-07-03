import { RecommendationRun } from "@/domain/entities/recommendation-run";
import {
  RecentRecommendationScore,
  RecommendationRunRepository,
} from "@/application/ports/recommendation-run-repository.port";
import { PrismaClient } from "@/generated/prisma/client";
import {
  toDomainRecommendationRun,
  toRecentRecommendationScore,
  toRecommendationItemRows,
  toRecommendationRunRow,
} from "./mappers/recommendation-run.mapper";

export class PrismaRecommendationRunRepository implements RecommendationRunRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findLatestByProfileId(profileId: string): Promise<RecommendationRun | null> {
    const row = await this.prisma.recommendationRun.findFirst({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    return row ? toDomainRecommendationRun(row) : null;
  }

  /** Write-once: a refresh always creates a brand new run + its items, never updates a previous one. */
  async save(run: RecommendationRun): Promise<void> {
    await this.prisma.recommendationRun.create({
      data: {
        id: run.id,
        ...toRecommendationRunRow(run),
        items: { create: toRecommendationItemRows(run) },
      },
    });
  }

  async findRecentScores(
    profileId: string,
    resumeId: string,
    jobIds: readonly string[],
    sinceDate: Date,
  ): Promise<Map<string, RecentRecommendationScore>> {
    if (jobIds.length === 0) return new Map();

    const rows = await this.prisma.recommendationItem.findMany({
      where: {
        profileId,
        resumeId,
        jobId: { in: [...jobIds] },
        scoredAt: { gte: sinceDate },
      },
      orderBy: { scoredAt: "desc" },
    });

    // Most-recent-first ordering + "set if absent" gives the latest score
    // per jobId without a second query or a SQL DISTINCT ON (SQLite has no
    // direct equivalent) — the candidate set is capped at 20, so this is cheap.
    const result = new Map<string, RecentRecommendationScore>();
    for (const row of rows) {
      if (result.has(row.jobId)) continue;
      result.set(row.jobId, toRecentRecommendationScore(row));
    }
    return result;
  }
}
