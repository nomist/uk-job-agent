import { NextResponse } from "next/server";
import {
  ApplicationLayerError,
  ApplicationNotFoundError,
  CannotDeleteOnlyResumeError,
  DuplicateActiveApplicationError,
  JobNotFoundError,
  ProfileNotFoundError,
  ResumeInUseError,
  ResumeNotFoundError,
  SavedJobNotFoundError,
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
const RATE_LIMIT_ERROR_NAMES = new Set([
  "AdzunaRateLimitError",
  "ReedRateLimitError",
  "OpenAiRateLimitError",
]);

// Friendly, user-facing label per upstream error name — used for both the
// 502 "temporarily unavailable" branch below and nowhere else, so a
// provider outage never leaks raw HTTP/JSON details (status codes,
// vendor-specific error text) into the response body. The full error is
// still logged server-side via console.error for diagnosis.
const UPSTREAM_ERROR_LABELS: Record<string, string> = {
  AdzunaRequestError: "Adzuna",
  ReedRequestError: "Reed",
  OpenAiRequestError: "the AI service",
  OpenAiResponseParseError: "the AI service",
};

/** Central error -> HTTP response mapping for every route handler. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiValidationError) {
    return NextResponse.json(
      { error: { message: error.message, issues: error.issues } },
      { status: 400 },
    );
  }

  // Deliberately no generic `ZodError -> 400` branch: parseJsonBody/parseQuery
  // (this file's actual request-validation entry points) always wrap zod
  // failures in ApiValidationError before throwing, so a *raw* ZodError
  // reaching here means zod was used somewhere else — e.g. an adapter's
  // config loader validating a missing env var deep inside a use case call.
  // That's a server misconfiguration, not a bad request, so it falls
  // through to the generic 500 below rather than being misreported as 400
  // (and rather than leaking internal schema field names to the caller).

  if (
    error instanceof JobNotFoundError ||
    error instanceof ProfileNotFoundError ||
    error instanceof ResumeNotFoundError ||
    error instanceof ApplicationNotFoundError ||
    error instanceof SavedJobNotFoundError
  ) {
    return NextResponse.json(
      { error: { message: error.message, code: error.code } },
      { status: 404 },
    );
  }

  if (
    error instanceof DuplicateActiveApplicationError ||
    error instanceof CannotDeleteOnlyResumeError ||
    error instanceof ResumeInUseError
  ) {
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

  // Missing/invalid OPENAI_API_KEY: a clear, actionable message rather
  // than a generic 500 — see openai-config.ts. 503 ("Service Unavailable")
  // fits better than 500 here: nothing is broken, a feature just isn't
  // configured yet.
  if (error instanceof Error && error.name === "OpenAiNotConfiguredError") {
    return NextResponse.json({ error: { message: error.message } }, { status: 503 });
  }

  if (error instanceof Error && RATE_LIMIT_ERROR_NAMES.has(error.name)) {
    const retryAfterSeconds = (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds;
    const retryHint =
      typeof retryAfterSeconds === "number"
        ? ` Please try again in about ${retryAfterSeconds} seconds.`
        : " Please try again in a moment.";
    const init: ResponseInit = { status: 429 };
    if (typeof retryAfterSeconds === "number") {
      init.headers = { "Retry-After": String(retryAfterSeconds) };
    }
    return NextResponse.json({ error: { message: `${error.message}.${retryHint}` } }, init);
  }

  if (error instanceof Error && error.name in UPSTREAM_ERROR_LABELS) {
    console.error(`Upstream provider error (${error.name}):`, error.message, error.cause ?? "");
    const label = UPSTREAM_ERROR_LABELS[error.name];
    return NextResponse.json(
      { error: { message: `${label} is temporarily unavailable. Please try again shortly.` } },
      { status: 502 },
    );
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
}
