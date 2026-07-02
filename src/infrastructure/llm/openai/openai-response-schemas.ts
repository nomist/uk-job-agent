import { z } from "zod";
import {
  AiCoverLetterResponse,
  AiCvSuggestionsResponse,
  AiMatchScoreResponse,
} from "@/application/dto/ai-provider.dto";
import { OpenAiResponseParseError } from "./openai-errors";

function parseJsonSafely(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new OpenAiResponseParseError("OpenAI returned a response that was not valid JSON", error);
  }
}

const matchScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  missingSkills: z.array(z.string()).default([]),
});

export function parseMatchScoreResponse(raw: string, modelVersion: string): AiMatchScoreResponse {
  const result = matchScoreSchema.safeParse(parseJsonSafely(raw));
  if (!result.success) {
    throw new OpenAiResponseParseError(
      `OpenAI match score response failed validation: ${result.error.message}`,
    );
  }
  return { ...result.data, modelVersion };
}

const coverLetterSchema = z.object({
  content: z.string().min(1),
});

export function parseCoverLetterResponse(raw: string, modelVersion: string): AiCoverLetterResponse {
  const result = coverLetterSchema.safeParse(parseJsonSafely(raw));
  if (!result.success) {
    throw new OpenAiResponseParseError(
      `OpenAI cover letter response failed validation: ${result.error.message}`,
    );
  }
  return { ...result.data, modelVersion };
}

const cvSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        category: z.string().min(1),
        text: z.string().min(1),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
      }),
    )
    .default([]),
});

export function parseCvSuggestionsResponse(
  raw: string,
  modelVersion: string,
): AiCvSuggestionsResponse {
  const result = cvSuggestionsSchema.safeParse(parseJsonSafely(raw));
  if (!result.success) {
    throw new OpenAiResponseParseError(
      `OpenAI CV suggestions response failed validation: ${result.error.message}`,
    );
  }
  return { ...result.data, modelVersion };
}
