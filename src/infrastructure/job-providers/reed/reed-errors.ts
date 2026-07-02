/** Wraps network failures, non-OK HTTP responses, and invalid JSON from the Reed API. */
export class ReedRequestError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "ReedRequestError";
  }
}
