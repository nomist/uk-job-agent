import {
  AiCoverLetterRequest,
  AiCoverLetterResponse,
  AiCvSuggestionsRequest,
  AiCvSuggestionsResponse,
  AiMatchScoreRequest,
  AiMatchScoreResponse,
} from "@/application/dto/ai-provider.dto";

export interface AiProvider {
  scoreMatch(request: AiMatchScoreRequest): Promise<AiMatchScoreResponse>;
  generateCoverLetter(request: AiCoverLetterRequest): Promise<AiCoverLetterResponse>;
  suggestCvImprovements(request: AiCvSuggestionsRequest): Promise<AiCvSuggestionsResponse>;
}
