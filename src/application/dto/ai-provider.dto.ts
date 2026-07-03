import { Job } from "@/domain/entities/job";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";

export interface AiMatchScoreRequest {
  job: Job;
  profile: Profile;
  resume: Resume;
}

export interface AiMatchScoreResponse {
  score: number;
  confidence: number;
  rationale: string;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  modelVersion: string;
}

export type CoverLetterTone = "FORMAL" | "ENTHUSIASTIC" | "CONCISE";

export interface AiCoverLetterRequest {
  job: Job;
  profile: Profile;
  resume: Resume;
  tone?: CoverLetterTone;
}

export interface AiCoverLetterResponse {
  content: string;
  modelVersion: string;
}

export type CvSuggestionPriority = "LOW" | "MEDIUM" | "HIGH";

// A fixed set (not a free-form string) so the UI can reliably group
// suggestions into labeled sections without depending on the AI's exact
// wording — see CvSuggestionsCard.
export const CV_SUGGESTION_CATEGORIES = [
  "MISSING_SKILLS",
  "WORDING",
  "STRUCTURE",
  "OTHER",
] as const;
export type CvSuggestionCategory = (typeof CV_SUGGESTION_CATEGORIES)[number];

export interface AiCvSuggestion {
  category: CvSuggestionCategory;
  text: string;
  priority: CvSuggestionPriority;
}

export interface AiCvSuggestionsRequest {
  resume: Resume;
  targetJob?: Job;
}

export interface AiCvSuggestionsResponse {
  suggestions: AiCvSuggestion[];
  modelVersion: string;
}
