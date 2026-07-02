/** Raised by parse-request.ts helpers on malformed JSON, query params, or a failed zod schema. */
export class ApiValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: unknown,
  ) {
    super(message);
    this.name = "ApiValidationError";
  }
}
