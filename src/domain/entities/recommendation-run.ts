import {
  InvalidRecommendationItemError,
  InvalidRecommendationRunError,
} from "@/domain/errors/domain-errors";
import { VisaStatus } from "@/domain/value-objects/visa-status";
import { WorkMode } from "@/domain/value-objects/work-mode";

/**
 * Snapshot of the Profile-derived (and user-adjusted) filters that produced
 * one recommendation run — persisted verbatim on the run so a past run
 * remains self-explanatory even after the Profile later changes.
 */
export interface RecommendationSearchFilters {
  headline?: string;
  skills: string[];
  locations: string[];
  workModes: WorkMode[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  visaStatus: VisaStatus;
  yearsOfExperience?: number;
  /** Never exceeds RECOMMENDATION_MAX_JOBS_TO_SCORE_CAP — see build-recommendation-search-filters.ts. */
  maxJobsToScore: number;
}

export interface RecommendationItemProps {
  jobId: string;
  score: number;
  reason: string;
  missingSkills?: string[];
}

/** One scored, ranked job within a RecommendationRun — a snapshot, not a live reference to a MatchScore row. */
export class RecommendationItem {
  private constructor(
    public readonly jobId: string,
    public readonly score: number,
    public readonly reason: string,
    public readonly missingSkills: readonly string[],
  ) {}

  static create(props: RecommendationItemProps): RecommendationItem {
    const jobId = props.jobId.trim();
    const reason = props.reason.trim();

    if (jobId.length === 0) {
      throw new InvalidRecommendationItemError("RecommendationItem jobId must not be empty");
    }
    if (reason.length === 0) {
      throw new InvalidRecommendationItemError("RecommendationItem reason must not be empty");
    }
    if (!Number.isInteger(props.score) || props.score < 0 || props.score > 100) {
      throw new InvalidRecommendationItemError(
        `RecommendationItem score must be an integer 0-100, got ${props.score}`,
      );
    }

    return new RecommendationItem(jobId, props.score, reason, props.missingSkills ?? []);
  }
}

export interface RecommendationRunProps {
  id: string;
  profileId: string;
  resumeId: string;
  createdAt: Date;
  searchFilters: RecommendationSearchFilters;
  rawResultCount: number;
  candidateCount: number;
  selectedForScoringCount: number;
  scoredCount: number;
  failedCount: number;
  items: RecommendationItem[];
}

/** One manual "Refresh recommendations" execution and its ranked results. */
export class RecommendationRun {
  private constructor(
    public readonly id: string,
    public readonly profileId: string,
    public readonly resumeId: string,
    public readonly createdAt: Date,
    public readonly searchFilters: RecommendationSearchFilters,
    public readonly rawResultCount: number,
    public readonly candidateCount: number,
    public readonly selectedForScoringCount: number,
    public readonly scoredCount: number,
    public readonly failedCount: number,
    public readonly items: readonly RecommendationItem[],
  ) {}

  static create(props: RecommendationRunProps): RecommendationRun {
    const id = props.id.trim();
    const profileId = props.profileId.trim();
    const resumeId = props.resumeId.trim();

    if (id.length === 0)
      throw new InvalidRecommendationRunError("RecommendationRun id must not be empty");
    if (profileId.length === 0) {
      throw new InvalidRecommendationRunError("RecommendationRun profileId must not be empty");
    }
    if (resumeId.length === 0) {
      throw new InvalidRecommendationRunError("RecommendationRun resumeId must not be empty");
    }
    for (const [label, value] of [
      ["rawResultCount", props.rawResultCount],
      ["candidateCount", props.candidateCount],
      ["selectedForScoringCount", props.selectedForScoringCount],
      ["scoredCount", props.scoredCount],
      ["failedCount", props.failedCount],
    ] as const) {
      if (!Number.isInteger(value) || value < 0) {
        throw new InvalidRecommendationRunError(
          `RecommendationRun ${label} must be a non-negative integer`,
        );
      }
    }
    if (props.scoredCount + props.failedCount > props.selectedForScoringCount) {
      throw new InvalidRecommendationRunError(
        "RecommendationRun scoredCount + failedCount cannot exceed selectedForScoringCount",
      );
    }

    // Defensive: the use case already produces a sorted list, but "ranked
    // list sorted by MatchScore descending" is a real invariant of this
    // entity, not just a UI concern — enforce it here too.
    const sortedItems = [...props.items].sort((a, b) => b.score - a.score);

    return new RecommendationRun(
      id,
      profileId,
      resumeId,
      props.createdAt,
      props.searchFilters,
      props.rawResultCount,
      props.candidateCount,
      props.selectedForScoringCount,
      props.scoredCount,
      props.failedCount,
      sortedItems,
    );
  }
}
