// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoverLetterCard } from "@/components/job-detail/cover-letter-card";
import type { CoverLetterJson } from "@/lib/api/ai-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const coverLetter: CoverLetterJson = {
  content: "Dear Hiring Manager,\n\nI am excited to apply...",
  modelVersion: "gpt-test",
  generatedAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CoverLetterCard", () => {
  it("does not call the API until the button is clicked", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<CoverLetterCard jobId="j1" />);

    expect(screen.getByText(/generate a tailored cover letter/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("generates and displays the cover letter content, without a Copy button before success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => jsonResponse({ coverLetter }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CoverLetterCard jobId="j1" />);
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));

    await waitFor(() => expect(screen.getByText(/I am excited to apply/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("copies the generated content to the clipboard and shows a confirmation", async () => {
    const user = userEvent.setup();
    // Defined after userEvent.setup() deliberately — user-event installs its
    // own navigator.clipboard stub as part of setup(), which would clobber
    // a mock defined any earlier (e.g. in a beforeEach).
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    const fetchMock = vi.fn(async () => jsonResponse({ coverLetter }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CoverLetterCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));
    await waitFor(() => screen.getByRole("button", { name: "Copy" }));

    await user.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copied ✓" })).toBeInTheDocument(),
    );
    expect(writeTextMock).toHaveBeenCalledWith(coverLetter.content);
  });

  it("shows a friendly error with a Retry button on failure", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { message: "AI provider unavailable" } }, 502),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CoverLetterCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));

    await waitFor(() => expect(screen.getByText("AI provider unavailable")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("preserves the previous cover letter when a retry fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ coverLetter }))
      .mockResolvedValueOnce(jsonResponse({ error: { message: "Upstream unavailable" } }, 502));
    vi.stubGlobal("fetch", fetchMock);

    render(<CoverLetterCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));
    await waitFor(() => screen.getByText(/I am excited to apply/));

    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    await waitFor(() => expect(screen.getByText("Upstream unavailable")).toBeInTheDocument());
    expect(screen.getByText(/I am excited to apply/)).toBeInTheDocument();
  });
});
