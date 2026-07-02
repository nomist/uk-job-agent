/** Wraps network failures, non-OK HTTP responses, and invalid JSON from the Adzuna API. */
export class AdzunaRequestError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "AdzunaRequestError";
  }
}
