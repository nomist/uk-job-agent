import { CURRENT_USER_ID } from "./current-user";

// Local, UI-owned types describing the wire JSON returned by the three AI
// action routes (see src/app/api/_lib/serializers.ts for matchScore; the
// cover-letter/cv-suggestions routes return their own inline shapes).

export type ConfidenceBand = "LOW" | "MEDIUM" | "HIGH";

export interface MatchScoreJson {
  id: string;
  jobId: string;
  profileId: string;
  resumeId: string;
  score: number;
  confidence: { value: number; band: ConfidenceBand };
  rationale: string;
  missingSkills: string[];
  modelVersion: string;
  isLatest: boolean;
  generatedAt: string;
}

export interface CoverLetterJson {
  content: string;
  modelVersion: string;
  generatedAt: string;
}

export type CvSuggestionPriority = "LOW" | "MEDIUM" | "HIGH";

export interface CvSuggestionJson {
  category: string;
  text: string;
  priority: CvSuggestionPriority;
}

export interface CvSuggestionsJson {
  suggestions: CvSuggestionJson[];
  modelVersion: string;
  generatedAt: string;
}

export type CoverLetterTone = "FORMAL" | "ENTHUSIASTIC" | "CONCISE";

/** Thrown when an AI action route responds with a non-OK status. */
export class AiRequestError extends Error {}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function postAiAction<T>(
  url: string,
  fallbackErrorMessage: string,
  fetchImpl: typeof fetch,
  body: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: CURRENT_USER_ID, ...body }),
  });

  if (!response.ok) {
    throw new AiRequestError(await readErrorMessage(response, fallbackErrorMessage));
  }

  return (await response.json()) as T;
}

/** Client-side wrapper around POST /api/jobs/:id/score — "Match score". */
export async function scoreJobMatch(
  jobId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MatchScoreJson> {
  const body = await postAiAction<{ matchScore: MatchScoreJson }>(
    `/api/jobs/${encodeURIComponent(jobId)}/score`,
    "Failed to compute match score",
    fetchImpl,
  );
  return body.matchScore;
}

/** Client-side wrapper around POST /api/jobs/:id/cover-letter — "Generate cover letter". */
export async function generateCoverLetter(
  jobId: string,
  tone: CoverLetterTone | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<CoverLetterJson> {
  const body = await postAiAction<{ coverLetter: CoverLetterJson }>(
    `/api/jobs/${encodeURIComponent(jobId)}/cover-letter`,
    "Failed to generate cover letter",
    fetchImpl,
    tone ? { tone } : {},
  );
  return body.coverLetter;
}

/** Client-side wrapper around POST /api/jobs/:id/cv-suggestions — "Improve CV". */
export async function suggestCvImprovements(
  jobId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CvSuggestionsJson> {
  return postAiAction<CvSuggestionsJson>(
    `/api/jobs/${encodeURIComponent(jobId)}/cv-suggestions`,
    "Failed to generate CV suggestions",
    fetchImpl,
  );
}
