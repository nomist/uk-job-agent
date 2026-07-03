/** Wraps network failures, non-OK HTTP responses, and invalid JSON from the Reed API. */
export class ReedRequestError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "ReedRequestError";
  }
}

/**
 * Distinguished from the generic request error so a caller can implement
 * backoff/retry using `retryAfterSeconds` (from the `Retry-After` header,
 * when Reed provides it) instead of treating a 429 the same as any other
 * failure. Mirrors OpenAiRateLimitError.
 */
export class ReedRateLimitError extends ReedRequestError {
  constructor(
    message: string,
    public readonly retryAfterSeconds?: number,
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = "ReedRateLimitError";
  }
}
