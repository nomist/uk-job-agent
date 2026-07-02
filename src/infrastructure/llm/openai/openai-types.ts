// Raw OpenAI Chat Completions API wire format. Deliberately NOT re-exported
// from index.ts — these types must never be visible outside this folder;
// every public method on OpenAiProvider returns only the shared
// application/dto/ai-provider.dto.ts DTOs.

export interface OpenAiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAiChatCompletionChoice {
  message: { role: string; content: string };
  finish_reason?: string;
}

export interface OpenAiChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: OpenAiChatCompletionChoice[];
}

export interface OpenAiErrorResponse {
  error?: { message?: string; type?: string; code?: string };
}
