// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDashboardRecommendations } from "@/components/dashboard/hooks/use-dashboard-recommendations";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const readyResponse = {
  status: "ready" as const,
  profile: null,
  prefillFilters: {
    skills: [],
    locations: [],
    workModes: [],
    visaStatus: "UNKNOWN",
    maxJobsToScore: 20,
  },
  maxJobsToScoreCap: 20,
  latestRun: null,
};

describe("useDashboardRecommendations", () => {
  it("fetches GET /api/dashboard/recommendations on mount, without hitting the refresh endpoint", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(readyResponse));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDashboardRecommendations("u1"));
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data?.status).toBe("ready");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/dashboard/recommendations?userId=u1",
    );
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("refresh"))).toBe(false);
  });

  it("surfaces an error message and status: error on a failed load", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { message: "Something broke" } }, 500),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDashboardRecommendations("u1"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorMessage).toBe("Something broke");
  });

  it("refetch() re-issues the GET request", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(readyResponse));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDashboardRecommendations("u1"));
    await waitFor(() => expect(result.current.status).toBe("success"));

    result.current.refetch();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
