// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CvSuggestionsCard } from "@/components/job-detail/cv-suggestions-card";
import type { CvSuggestionsJson } from "@/lib/api/ai-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const suggestions: CvSuggestionsJson = {
  suggestions: [
    { category: "WORDING", text: "Quantify your impact.", priority: "MEDIUM" },
    { category: "MISSING_SKILLS", text: "Add Kubernetes experience.", priority: "HIGH" },
    { category: "STRUCTURE", text: "Move education below experience.", priority: "LOW" },
  ],
  modelVersion: "gpt-test",
  generatedAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CvSuggestionsCard", () => {
  it("does not call the API until the button is clicked", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<CvSuggestionsCard jobId="j1" />);

    expect(screen.getByText(/get suggestions to improve your cv/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a loading state, disables the button, then renders suggestions grouped by category", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(suggestions));
    vi.stubGlobal("fetch", fetchMock);

    render(<CvSuggestionsCard jobId="j1" />);
    const button = screen.getByRole("button", { name: "Improve CV" });

    await user.click(button);

    await waitFor(() => expect(screen.getByText(/Quantify your impact/)).toBeInTheDocument());
    expect(screen.getByText("Wording improvements")).toBeInTheDocument();
    expect(screen.getByText("Missing skills")).toBeInTheDocument();
    expect(screen.getByText("Structure")).toBeInTheDocument();
    expect(screen.getByText(/Add Kubernetes experience/)).toBeInTheDocument();
    expect(screen.getByText(/Move education below experience/)).toBeInTheDocument();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("LOW")).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    expect(requestedUrl).toBe("/api/jobs/j1/cv-suggestions");
  });

  it("does not render a group heading for a category with no suggestions", async () => {
    const user = userEvent.setup();
    const wordingOnly: CvSuggestionsJson = {
      ...suggestions,
      suggestions: [{ category: "WORDING", text: "Quantify your impact.", priority: "MEDIUM" }],
    };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(wordingOnly));
    vi.stubGlobal("fetch", fetchMock);

    render(<CvSuggestionsCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Improve CV" }));

    await waitFor(() => expect(screen.getByText("Wording improvements")).toBeInTheDocument());
    expect(screen.queryByText("Missing skills")).not.toBeInTheDocument();
    expect(screen.queryByText("Structure")).not.toBeInTheDocument();
    expect(screen.queryByText("Other")).not.toBeInTheDocument();
  });

  it("shows a friendly error with a Retry button on failure", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { message: "Resume not found" } }, 404),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CvSuggestionsCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Improve CV" }));

    await waitFor(() => expect(screen.getByText("Resume not found")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("preserves previous suggestions when a retry fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(suggestions))
      .mockResolvedValueOnce(jsonResponse({ error: { message: "Upstream unavailable" } }, 502));
    vi.stubGlobal("fetch", fetchMock);

    render(<CvSuggestionsCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Improve CV" }));
    await waitFor(() => screen.getByText(/Quantify your impact/));

    await user.click(screen.getByRole("button", { name: "Re-analyze" }));

    await waitFor(() => expect(screen.getByText("Upstream unavailable")).toBeInTheDocument());
    expect(screen.getByText(/Quantify your impact/)).toBeInTheDocument();
  });
});
