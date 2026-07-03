// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRefreshRecommendations } from "@/components/dashboard/hooks/use-refresh-recommendations";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const runFixture = {
  id: "run1",
  profileId: "p1",
  resumeId: "r1",
  createdAt: "2026-01-15T00:00:00.000Z",
  searchFilters: {
    skills: [],
    locations: [],
    workModes: [],
    visaStatus: "UNKNOWN",
    maxJobsToScore: 20,
  },
  rawResultCount: 5,
  candidateCount: 3,
  selectedForScoringCount: 1,
  scoredCount: 1,
  failedCount: 0,
  items: [],
};

describe("useRefreshRecommendations", () => {
  it("starts idle and calls POST /api/dashboard/recommendations/refresh only once run() is invoked", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ run: runFixture }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useRefreshRecommendations("u1", { maxJobsToScore: 20 }, false),
    );
    expect(result.current.status).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.run();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.result?.id).toBe("run1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/dashboard/recommendations/refresh");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ userId: "u1", filters: { maxJobsToScore: 20 }, forceRescore: false });
  });

  it("sends the current forceRescore value in the request body", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ run: runFixture }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useRefreshRecommendations("u1", {}, true));

    await act(async () => {
      await result.current.run();
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.forceRescore).toBe(true);
  });

  it("preserves the previous successful result if a later call fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ run: runFixture }))
      .mockResolvedValueOnce(jsonResponse({ error: { message: "AI service unavailable" } }, 502));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useRefreshRecommendations("u1", {}, false));

    await act(async () => {
      await result.current.run();
    });
    await waitFor(() => expect(result.current.status).toBe("success"));

    await act(async () => {
      await result.current.run();
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.result?.id).toBe("run1");
    expect(result.current.errorMessage).toBe("AI service unavailable");
  });
});
