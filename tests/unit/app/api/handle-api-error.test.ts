import { describe, expect, it, vi } from "vitest";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { ApiValidationError } from "@/app/api/_lib/errors";
import { JobNotFoundError } from "@/application/errors/application-errors";

async function bodyOf(response: Response) {
  return response.json();
}

describe("handleApiError", () => {
  it("maps ApiValidationError to 400 with the message and issues", async () => {
    const error = new ApiValidationError("Request body failed validation", [{ path: ["q"] }]);

    const response = handleApiError(error);
    const body = await bodyOf(response);

    expect(response.status).toBe(400);
    expect(body.error.message).toBe("Request body failed validation");
    expect(body.error.issues).toEqual([{ path: ["q"] }]);
  });

  it("maps JobNotFoundError to 404", async () => {
    const response = handleApiError(new JobNotFoundError("j1"));
    expect(response.status).toBe(404);
  });

  it("maps OpenAiNotConfiguredError to 503 with a clear, actionable message", async () => {
    const error = new Error(
      "AI features are not configured. Set OPENAI_API_KEY to enable Match Score, Cover Letter, and CV Suggestions.",
    );
    error.name = "OpenAiNotConfiguredError";

    const response = handleApiError(error);
    const body = await bodyOf(response);

    expect(response.status).toBe(503);
    expect(body.error.message).toBe(
      "AI features are not configured. Set OPENAI_API_KEY to enable Match Score, Cover Letter, and CV Suggestions.",
    );
  });

  describe("rate limit errors", () => {
    for (const name of ["AdzunaRateLimitError", "ReedRateLimitError", "OpenAiRateLimitError"]) {
      it(`maps ${name} to 429 with a Retry-After header and a friendly, actionable message`, async () => {
        const error = new Error("Some rate limit message") as Error & {
          retryAfterSeconds?: number;
        };
        error.name = name;
        error.retryAfterSeconds = 20;

        const response = handleApiError(error);
        const body = await bodyOf(response);

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("20");
        expect(body.error.message).toBe(
          "Some rate limit message. Please try again in about 20 seconds.",
        );
      });
    }

    it("omits the Retry-After header and uses a generic retry hint when no retryAfterSeconds is given", async () => {
      const error = new Error("Rate limited");
      error.name = "OpenAiRateLimitError";

      const response = handleApiError(error);
      const body = await bodyOf(response);

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBeNull();
      expect(body.error.message).toBe("Rate limited. Please try again in a moment.");
    });
  });

  describe("upstream provider errors", () => {
    const cases: Array<[string, string]> = [
      ["AdzunaRequestError", "Adzuna"],
      ["ReedRequestError", "Reed"],
      ["OpenAiRequestError", "the AI service"],
      ["OpenAiResponseParseError", "the AI service"],
    ];

    for (const [errorName, expectedLabel] of cases) {
      it(`maps ${errorName} to a 502 with a friendly message, hiding the raw technical detail`, async () => {
        const error = new Error(
          "Adzuna responded with 500 Internal Server Error: raw upstream junk",
        );
        error.name = errorName;
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const response = handleApiError(error);
        const body = await bodyOf(response);

        expect(response.status).toBe(502);
        expect(body.error.message).toBe(
          `${expectedLabel} is temporarily unavailable. Please try again shortly.`,
        );
        expect(body.error.message).not.toContain("raw upstream junk");
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });
    }
  });

  it("falls through to a generic 500 for an unrecognized error, without leaking its message", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = handleApiError(new Error("some internal implementation detail"));
    const body = await bodyOf(response);

    expect(response.status).toBe(500);
    expect(body.error.message).toBe("Internal server error");
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("falls through to a generic 500 for a raw (non-ApiValidationError) ZodError", async () => {
    // Simulates an adapter config loader's zod failure reaching this file
    // directly — see the file's own comment on why this isn't a 400.
    const zodLikeError = new Error("Invalid input");
    zodLikeError.name = "ZodError";

    const response = handleApiError(zodLikeError);

    expect(response.status).toBe(500);
  });
});
