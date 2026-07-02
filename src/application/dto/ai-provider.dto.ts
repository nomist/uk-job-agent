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

export interface AiCvSuggestion {
  category: string;
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
