import {
  RecommendationItem,
  RecommendationRun,
  RecommendationSearchFilters,
} from "@/domain/entities/recommendation-run";
import { Prisma } from "@/generated/prisma/client";

export type RecommendationRunRowWithItems = Prisma.RecommendationRunModel & {
  items: Prisma.RecommendationItemModel[];
};

export function toDomainRecommendationRun(row: RecommendationRunRowWithItems): RecommendationRun {
  return RecommendationRun.create({
    id: row.id,
    profileId: row.profileId,
    resumeId: row.resumeId,
    createdAt: row.createdAt,
    searchFilters: JSON.parse(row.searchFilters) as RecommendationSearchFilters,
    rawResultCount: row.rawResultCount,
    candidateCount: row.candidateCount,
    selectedForScoringCount: row.selectedForScoringCount,
    scoredCount: row.scoredCount,
    failedCount: row.failedCount,
    items: row.items.map(toDomainRecommendationItem),
  });
}

function toDomainRecommendationItem(row: Prisma.RecommendationItemModel): RecommendationItem {
  return RecommendationItem.create({
    jobId: row.jobId,
    score: row.score,
    reason: row.reason,
    missingSkills: JSON.parse(row.missingSkills) as string[],
  });
}

/** Scalar row shape for the RecommendationRun table itself (excludes nested items). */
export function toRecommendationRunRow(run: RecommendationRun) {
  return {
    profileId: run.profileId,
    resumeId: run.resumeId,
    createdAt: run.createdAt,
    // RecommendationSearchFilters on the domain entity — JSON-encoded, same
    // reasoning as Profile.skills (SQLite has no native array/object type).
    searchFilters: JSON.stringify(run.searchFilters),
    rawResultCount: run.rawResultCount,
    candidateCount: run.candidateCount,
    selectedForScoringCount: run.selectedForScoringCount,
    scoredCount: run.scoredCount,
    failedCount: run.failedCount,
  };
}

/** Nested-create row shape for a run's RecommendationItem rows — profileId/resumeId/scoredAt are denormalized from the parent run. */
export function toRecommendationItemRows(run: RecommendationRun) {
  return run.items.map((item) => ({
    jobId: item.jobId,
    profileId: run.profileId,
    resumeId: run.resumeId,
    scoredAt: run.createdAt,
    score: item.score,
    reason: item.reason,
    missingSkills: JSON.stringify(item.missingSkills),
  }));
}

export interface RecentRecommendationScoreRow {
  jobId: string;
  score: number;
  reason: string;
  missingSkills: string;
  scoredAt: Date;
}

export function toRecentRecommendationScore(row: RecentRecommendationScoreRow) {
  return {
    jobId: row.jobId,
    score: row.score,
    reason: row.reason,
    missingSkills: JSON.parse(row.missingSkills) as string[],
    scoredAt: row.scoredAt,
  };
}
