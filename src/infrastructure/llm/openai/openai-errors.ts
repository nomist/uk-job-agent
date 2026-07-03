/** Wraps network failures, non-OK HTTP responses, and invalid JSON from the OpenAI API. */
export class OpenAiRequestError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "OpenAiRequestError";
  }
}

/**
 * Distinguished from the generic request error so a caller can implement
 * backoff/retry using `retryAfterSeconds` (from the `Retry-After` header,
 * when OpenAI provides it) instead of treating a 429 the same as any other
 * failure.
 */
export class OpenAiRateLimitError extends OpenAiRequestError {
  constructor(
    message: string,
    public readonly retryAfterSeconds?: number,
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = "OpenAiRateLimitError";
  }
}

/** The HTTP call succeeded, but the assistant's JSON content didn't match the expected shape. */
export class OpenAiResponseParseError extends OpenAiRequestError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "OpenAiResponseParseError";
  }
}

/**
 * Thrown by loadOpenAiConfig() when OPENAI_API_KEY is missing/invalid,
 * instead of letting the underlying zod ValidationError escape. A named
 * error lets handle-api-error.ts return a clear "AI features aren't
 * configured" response instead of a generic 500 with leaked schema field
 * names (see that file's comment on why raw ZodErrors are never special-cased).
 */
export class OpenAiNotConfiguredError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "OpenAiNotConfiguredError";
  }
}
