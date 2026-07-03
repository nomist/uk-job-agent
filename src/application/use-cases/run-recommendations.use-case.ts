import { randomUUID } from "node:crypto";
import { Job } from "@/domain/entities/job";
import { RecommendationItem, RecommendationRun } from "@/domain/entities/recommendation-run";
import { ProfileNotFoundError, ResumeNotFoundError } from "@/application/errors/application-errors";
import { ApplicationRepository } from "@/application/ports/application-repository.port";
import { ProfileRepository } from "@/application/ports/profile-repository.port";
import {
  RecentRecommendationScore,
  RecommendationRunRepository,
} from "@/application/ports/recommendation-run-repository.port";
import { ResumeRepository } from "@/application/ports/resume-repository.port";
import { SavedJobRepository } from "@/application/ports/saved-job-repository.port";
import {
  buildProviderSearchQueries,
  buildRecommendationSearchFilters,
  RecommendationSearchFiltersOverrides,
} from "@/application/use-cases/build-recommendation-search-filters";
import { rankCandidatesForScoring } from "@/application/use-cases/rank-recommendation-candidates";
import { ScoreJobMatchUseCase } from "@/application/use-cases/score-job-match.use-case";
import { SearchJobsUseCase } from "@/application/use-cases/search-jobs.use-case";

/** A job scored within this window is reused as-is rather than re-scored, unless forceRescore is set. */
const DEFAULT_RECENT_SCORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface RunRecommendationsInput {
  profileId: string;
  filters?: RecommendationSearchFiltersOverrides;
  /** Bypasses the recent-score cache — the one deliberate way to spend AI tokens on a job scored recently. */
  forceRescore?: boolean;
}

/**
 * The manual "Refresh recommendations" flow (Milestone 8.2): builds one or
 * more provider queries from the Profile/Resume (plus any user-adjusted
 * filters), searches + dedupes via the existing SearchJobsUseCase, excludes
 * dismissed/expired/already-applied jobs, deterministically pre-ranks the
 * remainder, caps at maxJobsToScore, and only then spends AI tokens —
 * reusing a recent score instead of a fresh AI call wherever possible, and
 * reusing the existing ScoreJobMatchUseCase for the calls that do happen.
 * One AI-scoring failure doesn't abort the run; it's just counted as failed.
 */
export class RunRecommendationsUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly searchJobsUseCase: SearchJobsUseCase,
    private readonly savedJobRepository: SavedJobRepository,
    private readonly applicationRepository: ApplicationRepository,
    private readonly scoreJobMatchUseCase: ScoreJobMatchUseCase,
    private readonly recommendationRunRepository: RecommendationRunRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly recentScoreWindowMs: number = DEFAULT_RECENT_SCORE_WINDOW_MS,
  ) {}

  async execute(input: RunRecommendationsInput): Promise<RecommendationRun> {
    const profile = await this.profileRepository.findById(input.profileId);
    if (!profile) throw new ProfileNotFoundError(input.profileId);

    const resume = await this.resumeRepository.findPrimaryByProfileId(profile.id);
    if (!resume) {
      throw new ResumeNotFoundError(`primary resume for profile ${profile.id}`);
    }

    const filters = buildRecommendationSearchFilters(profile, resume, input.filters);
    const queries = buildProviderSearchQueries(filters);

    let rawResultCount = 0;
    const jobsById = new Map<string, Job>();
    for (const query of queries) {
      const result = await this.searchJobsUseCase.execute(query);
      rawResultCount += result.totalListingsFound;
      for (const job of result.jobs) jobsById.set(job.id, job);
    }

    const [savedJobRecords, applications] = await Promise.all([
      this.savedJobRepository.findByUserId(profile.userId),
      this.applicationRepository.findByUserId(profile.userId),
    ]);
    const dismissedJobIds = new Set(
      savedJobRecords
        .filter((record) => record.status === "DISMISSED")
        .map((record) => record.jobId),
    );
    const appliedJobIds = new Set(applications.map((application) => application.jobId));

    // `!job.isExpired` is a defensive, spec-required check: in practice
    // SearchJobsUseCase's own recordSighting() already un-expires any job
    // still returned by a live provider search, so a job that's genuinely
    // expired simply won't be in `jobsById` at all (absent, not filtered) —
    // this guards the (currently unreachable) case where that invariant
    // changes, without adding real cost.
    const candidates = [...jobsById.values()].filter(
      (job) => !job.isExpired && !dismissedJobIds.has(job.id) && !appliedJobIds.has(job.id),
    );

    const now = this.now();
    const ranked = rankCandidatesForScoring(candidates, filters, now);
    const selected = ranked.slice(0, filters.maxJobsToScore);

    const recentScores = await this.loadRecentScores(profile.id, resume.id, selected, input, now);

    const items: RecommendationItem[] = [];
    let scoredCount = 0;
    let failedCount = 0;

    for (const job of selected) {
      const recent = recentScores.get(job.id);
      if (recent) {
        items.push(
          RecommendationItem.create({
            jobId: job.id,
            score: recent.score,
            reason: recent.reason,
            missingSkills: recent.missingSkills,
          }),
        );
        scoredCount++;
        continue;
      }

      try {
        const matchScore = await this.scoreJobMatchUseCase.execute({
          jobId: job.id,
          profileId: profile.id,
          resumeId: resume.id,
        });
        items.push(
          RecommendationItem.create({
            jobId: job.id,
            score: matchScore.score,
            reason: matchScore.rationale,
            missingSkills: [...matchScore.missingSkills],
          }),
        );
        scoredCount++;
      } catch {
        // One job's AI call failing (rate limit, transient error) shouldn't
        // abort the whole run — the rest still get scored, and this one is
        // simply reflected in failedCount for the user to see.
        failedCount++;
      }
    }

    const run = RecommendationRun.create({
      id: randomUUID(),
      profileId: profile.id,
      resumeId: resume.id,
      createdAt: now,
      searchFilters: filters,
      rawResultCount,
      candidateCount: candidates.length,
      selectedForScoringCount: selected.length,
      scoredCount,
      failedCount,
      items,
    });

    await this.recommendationRunRepository.save(run);
    return run;
  }

  private async loadRecentScores(
    profileId: string,
    resumeId: string,
    selected: readonly Job[],
    input: RunRecommendationsInput,
    now: Date,
  ): Promise<Map<string, RecentRecommendationScore>> {
    if (input.forceRescore || selected.length === 0) {
      return new Map();
    }
    const sinceDate = new Date(now.getTime() - this.recentScoreWindowMs);
    return this.recommendationRunRepository.findRecentScores(
      profileId,
      resumeId,
      selected.map((job) => job.id),
      sinceDate,
    );
  }
}
