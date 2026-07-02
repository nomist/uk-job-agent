import {
  AiCoverLetterResponse,
  AiCvSuggestionsResponse,
  AiMatchScoreResponse,
} from "@/application/dto/ai-provider.dto";
import { AiProvider } from "@/application/ports/ai-provider.port";

export class FakeAiProvider implements AiProvider {
  scoreMatchResponse: AiMatchScoreResponse = {
    score: 80,
    confidence: 0.8,
    rationale: "Strong overlap on core skills.",
    missingSkills: ["Kubernetes"],
    modelVersion: "fake-model-1",
  };

  coverLetterResponse: AiCoverLetterResponse = {
    content: "Dear Hiring Manager, ...",
    modelVersion: "fake-model-1",
  };

  cvSuggestionsResponse: AiCvSuggestionsResponse = {
    suggestions: [{ category: "wording", text: "Quantify your impact.", priority: "MEDIUM" }],
    modelVersion: "fake-model-1",
  };

  async scoreMatch(): Promise<AiMatchScoreResponse> {
    return this.scoreMatchResponse;
  }

  async generateCoverLetter(): Promise<AiCoverLetterResponse> {
    return this.coverLetterResponse;
  }

  async suggestCvImprovements(): Promise<AiCvSuggestionsResponse> {
    return this.cvSuggestionsResponse;
  }
}
