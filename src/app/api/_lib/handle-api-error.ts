import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ApplicationLayerError,
  ApplicationNotFoundError,
  DuplicateActiveApplicationError,
  JobNotFoundError,
  ProfileNotFoundError,
  ResumeNotFoundError,
} from "@/application/errors/application-errors";
import {
  DomainError,
  InvalidApplicationStatusTransitionError,
} from "@/domain/errors/domain-errors";
import { ApiValidationError } from "./errors";

// Infrastructure failures (Adzuna/Reed/OpenAI) are identified by Error#name
// rather than `instanceof` + an import — this file stays under src/app,
// so it must not import provider-specific code ("no provider imports
// outside DI"). Name-based matching gets the same status-code behavior
// without that import.
const RATE_LIMIT_ERROR_NAMES = new Set(["OpenAiRateLimitError"]);
const UPSTREAM_ERROR_NAMES = new Set([
  "AdzunaRequestError",
  "ReedRequestError",
  "OpenAiRequestError",
  "OpenAiResponseParseError",
]);

/** Central error -> HTTP response mapping for every route handler. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiValidationError) {
    return NextResponse.json(
      { error: { message: error.message, issues: error.issues } },
      { status: 400 },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { message: "Validation failed", issues: error.issues } },
      { status: 400 },
    );
  }

  if (
    error instanceof JobNotFoundError ||
    error instanceof ProfileNotFoundError ||
    error instanceof ResumeNotFoundError ||
    error instanceof ApplicationNotFoundError
  ) {
    return NextResponse.json(
      { error: { message: error.message, code: error.code } },
      { status: 404 },
    );
  }

  if (error instanceof DuplicateActiveApplicationError) {
    return NextResponse.json(
      { error: { message: error.message, code: error.code } },
      { status: 409 },
    );
  }

  if (error instanceof InvalidApplicationStatusTransitionError) {
    return NextResponse.json(
      { error: { message: error.message, code: error.code } },
      { status: 409 },
    );
  }

  // Any other domain invariant / application-layer error not special-cased
  // above is treated as a bad request (malformed input reaching an entity
  // or use case), not a server fault.
  if (error instanceof ApplicationLayerError || error instanceof DomainError) {
    return NextResponse.json(
      { error: { message: error.message, code: error.code } },
      { status: 400 },
    );
  }

  if (error instanceof Error && RATE_LIMIT_ERROR_NAMES.has(error.name)) {
    const retryAfterSeconds = (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds;
    const init: ResponseInit = { status: 429 };
    if (typeof retryAfterSeconds === "number") {
      init.headers = { "Retry-After": String(retryAfterSeconds) };
    }
    return NextResponse.json({ error: { message: error.message } }, init);
  }

  if (error instanceof Error && UPSTREAM_ERROR_NAMES.has(error.name)) {
    return NextResponse.json({ error: { message: error.message } }, { status: 502 });
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
}
