import {
  AiCoverLetterRequest,
  AiCoverLetterResponse,
  AiCvSuggestionsRequest,
  AiCvSuggestionsResponse,
  AiMatchScoreRequest,
  AiMatchScoreResponse,
} from "@/application/dto/ai-provider.dto";
import { AiProvider } from "@/application/ports/ai-provider.port";
import { createChatCompletion } from "./openai-client";
import { loadOpenAiConfig, OpenAiConfig } from "./openai-config";
import {
  buildCoverLetterPrompt,
  buildCvSuggestionsPrompt,
  buildMatchScorePrompt,
} from "./openai-prompts";
import {
  parseCoverLetterResponse,
  parseCvSuggestionsResponse,
  parseMatchScoreResponse,
} from "./openai-response-schemas";

export class OpenAiProvider implements AiProvider {
  constructor(
    private readonly config: OpenAiConfig = loadOpenAiConfig(),
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async scoreMatch(request: AiMatchScoreRequest): Promise<AiMatchScoreResponse> {
    const content = await createChatCompletion(
      this.config,
      buildMatchScorePrompt(request),
      this.fetchImpl,
    );
    return parseMatchScoreResponse(content, this.config.model);
  }

  async generateCoverLetter(request: AiCoverLetterRequest): Promise<AiCoverLetterResponse> {
    const content = await createChatCompletion(
      this.config,
      buildCoverLetterPrompt(request),
      this.fetchImpl,
    );
    return parseCoverLetterResponse(content, this.config.model);
  }

  async suggestCvImprovements(request: AiCvSuggestionsRequest): Promise<AiCvSuggestionsResponse> {
    const content = await createChatCompletion(
      this.config,
      buildCvSuggestionsPrompt(request),
      this.fetchImpl,
    );
    return parseCvSuggestionsResponse(content, this.config.model);
  }
}
