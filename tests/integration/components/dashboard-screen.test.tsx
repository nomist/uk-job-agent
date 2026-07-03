// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
import type {
  DashboardRecommendationsResponse,
  RecommendationRunJson,
} from "@/lib/api/dashboard-client";
import type { JobSearchResult } from "@/lib/api/jobs-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function buildJob(overrides: Partial<JobSearchResult> = {}): JobSearchResult {
  return {
    id: "j1",
    companyId: "acme",
    provider: "ADZUNA",
    externalId: "e1",
    title: "Backend Engineer",
    description: "desc",
    location: { city: "London", region: null, country: "UK", isRemote: false },
    url: "https://example.com/jobs/1",
    salaryRange: null,
    employmentType: null,
    workMode: null,
    postedAt: null,
    firstSeenAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-01-01T00:00:00.000Z",
    isExpired: false,
    canonicalJobId: null,
    ...overrides,
  };
}

function buildRun(overrides: Partial<RecommendationRunJson> = {}): RecommendationRunJson {
  return {
    id: "run1",
    profileId: "p1",
    resumeId: "r1",
    createdAt: "2026-01-15T09:00:00.000Z",
    searchFilters: {
      skills: [],
      locations: [],
      workModes: [],
      visaStatus: "UNKNOWN",
      maxJobsToScore: 20,
    },
    rawResultCount: 10,
    candidateCount: 5,
    selectedForScoringCount: 1,
    scoredCount: 1,
    failedCount: 0,
    items: [
      { jobId: "j1", score: 85, reason: "Great overlap.", missingSkills: [], job: buildJob() },
    ],
    ...overrides,
  };
}

function buildDashboardResponse(
  overrides: Partial<DashboardRecommendationsResponse> = {},
): DashboardRecommendationsResponse {
  return {
    status: "ready",
    profile: {
      id: "p1",
      userId: "local-dev-user",
      headline: "Backend Engineer",
      yearsOfExperience: null,
      skills: [],
      preferredLocations: [],
      workPreferences: [],
      visaStatus: "UNKNOWN",
      salaryExpectation: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    prefillFilters: {
      skills: [],
      locations: [],
      workModes: [],
      visaStatus: "UNKNOWN",
      maxJobsToScore: 20,
    },
    maxJobsToScoreCap: 20,
    latestRun: null,
    ...overrides,
  };
}

function mockFetch(
  dashboardResponse: DashboardRecommendationsResponse,
  refreshRun?: RecommendationRunJson,
) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.startsWith("/api/dashboard/recommendations/refresh") && method === "POST") {
      return jsonResponse({ run: refreshRun ?? buildRun() });
    }
    if (url.startsWith("/api/dashboard/recommendations")) {
      return jsonResponse(dashboardResponse);
    }
    throw new Error(`Unexpected fetch: ${method} ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("DashboardScreen", () => {
  it("shows a setup prompt linking to Profile when there's no Profile yet", async () => {
    mockFetch(
      buildDashboardResponse({ status: "no_profile", profile: null, prefillFilters: null }),
    );

    render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByText(/set up your profile first/i)).toBeInTheDocument());
    const link = screen.getByRole("link", { name: /go to profile/i });
    expect(link).toHaveAttribute("href", "/profile");
  });

  it("shows a setup prompt linking to Resumes when there's a Profile but no primary Resume", async () => {
    mockFetch(buildDashboardResponse({ status: "no_resume", prefillFilters: null }));

    render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByText(/add a primary resume/i)).toBeInTheDocument());
    const link = screen.getByRole("link", { name: /go to resumes/i });
    expect(link).toHaveAttribute("href", "/resumes");
  });

  it("loads the Dashboard without ever calling the refresh (AI-triggering) endpoint on its own", async () => {
    const fetchMock = mockFetch(buildDashboardResponse());

    render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByText(/recommendation settings/i)).toBeInTheDocument());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/dashboard/recommendations");
    expect(String(url)).not.toContain("refresh");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("shows a 'no recommendations yet' empty state when ready but no run has ever completed", async () => {
    mockFetch(buildDashboardResponse({ latestRun: null }));

    render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByText(/no recommendations yet/i)).toBeInTheDocument());
  });

  it("shows the previously saved run's results by default, without any user action", async () => {
    mockFetch(buildDashboardResponse({ latestRun: buildRun() }));

    render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByText("Backend Engineer")).toBeInTheDocument());
    expect(screen.getByText("85/100")).toBeInTheDocument();
    expect(screen.getByText(/last refreshed at/i)).toBeInTheDocument();
  });

  it("only calls the refresh endpoint after the user clicks Refresh recommendations", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(buildDashboardResponse());

    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText(/recommendation settings/i)).toBeInTheDocument());

    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("refresh"))).toBe(false);

    await user.click(screen.getByRole("button", { name: /refresh recommendations/i }));

    await waitFor(() => expect(screen.getByText("Backend Engineer")).toBeInTheDocument());
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("refresh"))).toBe(true);
  });

  it("shows a partial-failure notice when the run reports a non-zero failedCount", async () => {
    mockFetch(buildDashboardResponse({ latestRun: buildRun({ failedCount: 2, scoredCount: 1 }) }));

    render(<DashboardScreen />);

    await waitFor(() =>
      expect(screen.getByText(/2 jobs couldn't be scored this run/i)).toBeInTheDocument(),
    );
  });

  it("does not show a partial-failure notice when failedCount is zero", async () => {
    mockFetch(buildDashboardResponse({ latestRun: buildRun({ failedCount: 0 }) }));

    render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByText("Backend Engineer")).toBeInTheDocument());
    expect(screen.queryByText(/couldn't be scored/i)).not.toBeInTheDocument();
  });

  it("shows the empty-results state when a run completed but scored nothing", async () => {
    mockFetch(
      buildDashboardResponse({
        latestRun: buildRun({ items: [], scoredCount: 0, selectedForScoringCount: 0 }),
      }),
    );

    render(<DashboardScreen />);

    await waitFor(() =>
      expect(screen.getByText(/no recommendations from this run/i)).toBeInTheDocument(),
    );
  });

  it("prefills the settings form from prefillFilters", async () => {
    mockFetch(
      buildDashboardResponse({
        prefillFilters: {
          headline: "Staff Backend Engineer",
          skills: ["TypeScript"],
          locations: ["London"],
          workModes: [],
          visaStatus: "UNKNOWN",
          maxJobsToScore: 20,
        },
      }),
    );

    render(<DashboardScreen />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("Staff Backend Engineer")).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue("TypeScript")).toBeInTheDocument();
    expect(screen.getByDisplayValue("London")).toBeInTheDocument();
  });

  it("shows the 'This will score up to N jobs' scope notice before refreshing", async () => {
    mockFetch(
      buildDashboardResponse({
        prefillFilters: {
          skills: [],
          locations: [],
          workModes: [],
          visaStatus: "UNKNOWN",
          maxJobsToScore: 7,
        },
      }),
    );

    render(<DashboardScreen />);

    await waitFor(() =>
      expect(screen.getByText(/this will score up to 7 jobs/i)).toBeInTheDocument(),
    );
  });
});
