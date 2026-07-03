import { OpenAiConfig } from "./openai-config";
import { OpenAiRateLimitError, OpenAiRequestError } from "./openai-errors";
import {
  OpenAiChatCompletionResponse,
  OpenAiChatMessage,
  OpenAiErrorResponse,
} from "./openai-types";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Sends one chat-completion request (JSON mode) and returns the assistant's
 * raw message content string. Pure HTTP/OpenAI-protocol concern — knows
 * nothing about domain entities or the Ai*Response DTOs; that mapping
 * happens in openai-response-schemas.ts.
 */
export async function createChatCompletion(
  config: OpenAiConfig,
  messages: OpenAiChatMessage[],
  fetchImpl: typeof fetch,
): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      // No `temperature` field: several newer models (e.g. reasoning
      // models, and per this fix's bug report, some GPT-5-family models)
      // reject any explicit temperature other than the API default (1)
      // with a 400. Omitting the field entirely — rather than hardcoding
      // 1 — lets every model use its own real default, including ones
      // that don't support the parameter at all. OPENAI_MODEL stays the
      // only per-deployment knob (see openai-config.ts).
      body: JSON.stringify({
        model: config.model,
        messages,
        response_format: { type: "json_object" },
      }),
    });
  } catch (error) {
    throw new OpenAiRequestError(`Failed to reach OpenAI: ${(error as Error).message}`, error);
  }

  if (response.status === 429) {
    throw new OpenAiRateLimitError("OpenAI rate limit exceeded", parseRetryAfter(response));
  }

  if (!response.ok) {
    const errorMessage = await safeReadErrorMessage(response);
    throw new OpenAiRequestError(
      `OpenAI responded with ${response.status} ${response.statusText}${errorMessage ? `: ${errorMessage}` : ""}`,
    );
  }

  let body: OpenAiChatCompletionResponse;
  try {
    body = (await response.json()) as OpenAiChatCompletionResponse;
  } catch (error) {
    throw new OpenAiRequestError("OpenAI returned an invalid JSON response", error);
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenAiRequestError("OpenAI response contained no message content");
  }

  return content;
}

function parseRetryAfter(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : undefined;
}

async function safeReadErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as OpenAiErrorResponse;
    return body.error?.message;
  } catch {
    return undefined;
  }
}
