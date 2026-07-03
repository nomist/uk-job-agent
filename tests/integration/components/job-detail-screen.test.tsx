// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JobDetailScreen } from "@/components/job-detail/job-detail-screen";
import type { JobSearchResult } from "@/lib/api/jobs-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const job: JobSearchResult = {
  id: "j1",
  companyId: "acme",
  provider: "ADZUNA",
  externalId: "1",
  title: "Staff Engineer",
  description: "Build great things.",
  location: { city: "London", region: null, country: "UK", isRemote: false },
  url: "https://example.com/jobs/1",
  salaryRange: { min: 60000, max: 80000, currency: "GBP" },
  employmentType: "FULL_TIME",
  workMode: null,
  postedAt: "2026-01-01T00:00:00.000Z",
  firstSeenAt: "2026-01-01T00:00:00.000Z",
  lastSeenAt: "2026-01-01T00:00:00.000Z",
  isExpired: false,
  canonicalJobId: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("JobDetailScreen", () => {
  it("loads and renders the job, and the three AI action cards without calling them", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ job }));
    vi.stubGlobal("fetch", fetchMock);

    render(<JobDetailScreen jobId="j1" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    expect(screen.getByText("acme")).toBeInTheDocument();
    expect(screen.getByText("GBP 60,000 - 80,000")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Score match" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate cover letter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Improve CV" })).toBeInTheDocument();
    // Only the job fetch happened — no AI action was auto-triggered.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows an error state with retry when the job fails to load", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: "Job not found" } }, 404))
      .mockResolvedValueOnce(jsonResponse({ job }));
    vi.stubGlobal("fetch", fetchMock);

    render(<JobDetailScreen jobId="j1" />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Job not found"));

    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("triggers the match score action independently of the cover letter and CV actions", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/score")) {
        return jsonResponse({
          matchScore: {
            id: "ms1",
            jobId: "j1",
            profileId: "p1",
            resumeId: "r1",
            score: 91,
            confidence: { value: 0.95, band: "HIGH" },
            rationale: "Excellent fit.",
            missingSkills: [],
            modelVersion: "gpt-test",
            isLatest: true,
            generatedAt: "2026-01-01T00:00:00.000Z",
          },
        });
      }
      return jsonResponse({ job });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<JobDetailScreen jobId="j1" />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Score match" }));

    await waitFor(() => expect(screen.getByText("91/100")).toBeInTheDocument());
    // Cover letter and CV suggestions cards remain untouched (idle).
    expect(screen.getByText(/generate a tailored cover letter/i)).toBeInTheDocument();
    expect(screen.getByText(/get suggestions to improve your cv/i)).toBeInTheDocument();
  });
});
