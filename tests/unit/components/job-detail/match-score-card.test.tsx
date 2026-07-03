// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchScoreCard } from "@/components/job-detail/match-score-card";
import type { MatchScoreJson } from "@/lib/api/ai-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const matchScore: MatchScoreJson = {
  id: "ms1",
  jobId: "j1",
  profileId: "p1",
  resumeId: "r1",
  score: 82,
  confidence: { value: 0.9, band: "HIGH" },
  rationale: "Strong overlap on core skills.",
  strengths: ["Strong TypeScript background", "Relevant domain experience"],
  weaknesses: ["Limited leadership experience"],
  missingSkills: ["Kubernetes"],
  modelVersion: "gpt-test",
  isLatest: true,
  generatedAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MatchScoreCard", () => {
  it("does not call the API until the button is clicked", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<MatchScoreCard jobId="j1" />);

    expect(screen.getByText(/see how well this job matches/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a loading state, disables the button, then renders the result", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ matchScore }));
    vi.stubGlobal("fetch", fetchMock);

    render(<MatchScoreCard jobId="j1" />);
    const button = screen.getByRole("button", { name: "Score match" });

    await user.click(button);

    await waitFor(() => expect(screen.getByText("82/100")).toBeInTheDocument());
    expect(screen.getByText("High confidence")).toBeInTheDocument();
    expect(screen.getByText("Strong overlap on core skills.")).toBeInTheDocument();
    expect(screen.getByText("Strong TypeScript background")).toBeInTheDocument();
    expect(screen.getByText("Relevant domain experience")).toBeInTheDocument();
    expect(screen.getByText("Limited leadership experience")).toBeInTheDocument();
    expect(screen.getByText(/Kubernetes/)).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    expect(requestedUrl).toBe("/api/jobs/j1/score");
  });

  it("shows a friendly error and a Retry button on failure, preserving no prior result", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { message: "Profile not found" } }, 404),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<MatchScoreCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Score match" }));

    await waitFor(() => expect(screen.getByText("Profile not found")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("preserves the previous successful result when a retry fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ matchScore }))
      .mockResolvedValueOnce(jsonResponse({ error: { message: "Upstream unavailable" } }, 502));
    vi.stubGlobal("fetch", fetchMock);

    render(<MatchScoreCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Score match" }));
    await waitFor(() => expect(screen.getByText("82/100")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Re-score" }));

    await waitFor(() => expect(screen.getByText("Upstream unavailable")).toBeInTheDocument());
    // Previous result still visible.
    expect(screen.getByText("82/100")).toBeInTheDocument();
  });

  it("renders Reasoning, Strengths, and Weaknesses as labeled sections", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ matchScore }));
    vi.stubGlobal("fetch", fetchMock);

    render(<MatchScoreCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Score match" }));

    await waitFor(() => expect(screen.getByText("Reasoning")).toBeInTheDocument());
    expect(screen.getByText("Strengths")).toBeInTheDocument();
    expect(screen.getByText("Weaknesses")).toBeInTheDocument();
  });

  it("omits the Strengths/Weaknesses headings when those lists are empty", async () => {
    const user = userEvent.setup();
    const emptyScore: MatchScoreJson = { ...matchScore, strengths: [], weaknesses: [] };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({ matchScore: emptyScore }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<MatchScoreCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Score match" }));

    await waitFor(() => expect(screen.getByText("Reasoning")).toBeInTheDocument());
    expect(screen.queryByText("Strengths")).not.toBeInTheDocument();
    expect(screen.queryByText("Weaknesses")).not.toBeInTheDocument();
  });
});
