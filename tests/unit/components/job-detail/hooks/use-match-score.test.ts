// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMatchScore } from "@/components/job-detail/hooks/use-match-score";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMatchScore", () => {
  it("starts idle and calls POST /api/jobs/:id/score only once run() is invoked", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({
        matchScore: {
          id: "ms1",
          jobId: "j1",
          profileId: "p1",
          resumeId: "r1",
          score: 90,
          confidence: { value: 0.9, band: "HIGH" },
          rationale: "Great fit.",
          strengths: [],
          weaknesses: [],
          missingSkills: [],
          modelVersion: "gpt-test",
          isLatest: true,
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useMatchScore("j1"));
    expect(result.current.status).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.run();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.result?.score).toBe(90);
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs/j1/score", expect.any(Object));
  });
});
