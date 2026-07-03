import { Job } from "@/domain/entities/job";
import { RecommendationSearchFilters } from "@/domain/entities/recommendation-run";
import { WorkMode } from "@/domain/value-objects/work-mode";

/**
 * Relative weight of each pre-ranking dimension — title and skill overlap
 * matter most for relevance, recency least. Every sub-score is 0-1, so
 * these weights sum to 1 and `total` is itself a 0-1 value.
 */
const WEIGHTS = {
  title: 0.25,
  skills: 0.25,
  location: 0.2,
  workMode: 0.15,
  salary: 0.1,
  recency: 0.05,
};

const RECENCY_HORIZON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PreRankScore {
  jobId: string;
  total: number;
  title: number;
  skills: number;
  location: number;
  workMode: number;
  salary: number;
  recency: number;
}

export interface ScoredCandidate {
  job: Job;
  score: PreRankScore;
}

/**
 * Deterministic (no AI) pre-ranking, used only when candidate volume
 * exceeds maxJobsToScore — picks which jobs are worth spending AI tokens
 * on. Scores every candidate on title match, skill keyword overlap,
 * location match, remote/work-mode match, salary match, and recency, then
 * sorts descending. Ties (e.g. all-neutral scores) preserve input order,
 * since Array#sort is stable.
 */
export function rankCandidatesForScoring(
  jobs: readonly Job[],
  filters: RecommendationSearchFilters,
  now: Date,
): Job[] {
  return scoreCandidates(jobs, filters, now)
    .sort((a, b) => b.score.total - a.score.total)
    .map((entry) => entry.job);
}

export function scoreCandidates(
  jobs: readonly Job[],
  filters: RecommendationSearchFilters,
  now: Date,
): ScoredCandidate[] {
  return jobs.map((job) => ({ job, score: scoreCandidate(job, filters, now) }));
}

export function scoreCandidate(
  job: Job,
  filters: RecommendationSearchFilters,
  now: Date,
): PreRankScore {
  const title = titleMatchScore(job.title, filters.headline);
  const skills = skillOverlapScore(job.title, job.description, filters.skills);
  const location = locationMatchScore(job, filters.locations);
  const workMode = workModeMatchScore(job.workMode, filters.workModes);
  const salary = salaryMatchScore(job.salaryRange, filters);
  const recency = recencyScore(job.postedAt ?? job.firstSeenAt, now);

  const total =
    title * WEIGHTS.title +
    skills * WEIGHTS.skills +
    location * WEIGHTS.location +
    workMode * WEIGHTS.workMode +
    salary * WEIGHTS.salary +
    recency * WEIGHTS.recency;

  return { jobId: job.id, total, title, skills, location, workMode, salary, recency };
}

/** 0-1: fraction of the target headline's words found in the job title. Neutral (0.5) with no headline to compare against. */
function titleMatchScore(jobTitle: string, headline: string | undefined): number {
  if (!headline) return 0.5;
  const headlineTokens = tokenize(headline);
  if (headlineTokens.length === 0) return 0.5;
  const titleTokens = new Set(tokenize(jobTitle));
  const overlap = headlineTokens.filter((token) => titleTokens.has(token)).length;
  return Math.min(1, overlap / headlineTokens.length);
}

/** 0-1: fraction of the profile's skills that appear (as whole words) in the job title/description. Neutral (0.5) with no skills. */
function skillOverlapScore(title: string, description: string, skills: readonly string[]): number {
  if (skills.length === 0) return 0.5;
  const textTokens = new Set(tokenize(`${title} ${description}`));
  const matched = skills.filter((skill) => {
    const skillTokens = tokenize(skill);
    return skillTokens.length > 0 && skillTokens.every((token) => textTokens.has(token));
  }).length;
  return Math.min(1, matched / skills.length);
}

/** 1 if remote or the job's place text contains a preferred location, 0 if not, 0.5 (neutral) with no preferred locations set. */
function locationMatchScore(job: Job, preferredLocations: readonly string[]): number {
  if (preferredLocations.length === 0) return 0.5;
  if (job.location.isRemote) return 1;
  const place = [job.location.city, job.location.region, job.location.country]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const matches = preferredLocations.some((location) => place.includes(location.toLowerCase()));
  return matches ? 1 : 0;
}

/** 1 if the job's work mode is in the preferred set, 0 if not, 0.5 (neutral) when either side is unknown. */
function workModeMatchScore(
  jobWorkMode: WorkMode | undefined,
  preferredModes: readonly WorkMode[],
): number {
  if (preferredModes.length === 0 || !jobWorkMode) return 0.5;
  return preferredModes.includes(jobWorkMode) ? 1 : 0;
}

/** 1 if the job's salary range overlaps the expectation, 0 if not, 0.5 (neutral) when either side or the currency is unknown/mismatched. */
function salaryMatchScore(
  jobSalary: Job["salaryRange"],
  filters: Pick<RecommendationSearchFilters, "salaryMin" | "salaryMax" | "salaryCurrency">,
): number {
  if (filters.salaryMin === undefined && filters.salaryMax === undefined) return 0.5;
  if (!jobSalary) return 0.5;
  if (filters.salaryCurrency && jobSalary.currency !== filters.salaryCurrency) return 0.5;

  const filterMin = filters.salaryMin ?? 0;
  const filterMax = filters.salaryMax ?? Number.POSITIVE_INFINITY;
  const overlaps = jobSalary.min <= filterMax && filterMin <= jobSalary.max;
  return overlaps ? 1 : 0;
}

/** Linear decay from 1 (posted today) to 0 (30+ days old). */
function recencyScore(postedAt: Date, now: Date): number {
  const ageDays = (now.getTime() - postedAt.getTime()) / DAY_MS;
  if (ageDays <= 0) return 1;
  if (ageDays >= RECENCY_HORIZON_DAYS) return 0;
  return 1 - ageDays / RECENCY_HORIZON_DAYS;
}

// Keeps "." as a token character (so compound tech terms like "node.js" or
// "c#"/"c++" survive intact) but strips it from token edges afterward, so a
// skill at the end of a sentence ("...with PostgreSQL.") still matches —
// only a genuinely internal "." (as in "node.js") is preserved.
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .map((token) => token.replace(/^\.+|\.+$/g, ""))
    .filter((token) => token.length > 1);
}
