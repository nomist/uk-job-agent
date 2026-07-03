import {
  AiCoverLetterResponse,
  AiCvSuggestionsResponse,
  AiMatchScoreRequest,
  AiMatchScoreResponse,
} from "@/application/dto/ai-provider.dto";
import { AiProvider } from "@/application/ports/ai-provider.port";

export class FakeAiProvider implements AiProvider {
  scoreMatchResponse: AiMatchScoreResponse = {
    score: 80,
    confidence: 0.8,
    rationale: "Strong overlap on core skills.",
    strengths: ["Strong TypeScript background", "Relevant domain experience"],
    weaknesses: ["Limited leadership experience"],
    missingSkills: ["Kubernetes"],
    modelVersion: "fake-model-1",
  };
  /** When set, overrides scoreMatchResponse entirely — lets a test throw or vary the result per request (e.g. per job.id). */
  scoreMatchImpl?: (request: AiMatchScoreRequest) => Promise<AiMatchScoreResponse>;
  scoreMatchCallCount = 0;

  coverLetterResponse: AiCoverLetterResponse = {
    content: "Dear Hiring Manager, ...",
    modelVersion: "fake-model-1",
  };

  cvSuggestionsResponse: AiCvSuggestionsResponse = {
    suggestions: [
      { category: "WORDING", text: "Quantify your impact.", priority: "MEDIUM" },
      { category: "MISSING_SKILLS", text: "Add Kubernetes experience.", priority: "HIGH" },
    ],
    modelVersion: "fake-model-1",
  };

  async scoreMatch(request: AiMatchScoreRequest): Promise<AiMatchScoreResponse> {
    this.scoreMatchCallCount++;
    if (this.scoreMatchImpl) return this.scoreMatchImpl(request);
    return this.scoreMatchResponse;
  }

  async generateCoverLetter(): Promise<AiCoverLetterResponse> {
    return this.coverLetterResponse;
  }

  async suggestCvImprovements(): Promise<AiCvSuggestionsResponse> {
    return this.cvSuggestionsResponse;
  }
}
