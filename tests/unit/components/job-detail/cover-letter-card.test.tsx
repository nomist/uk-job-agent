// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

let writeTextMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeTextMock = vi.fn().mockResolvedValue(undefined);
});

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

  it("generates and displays the cover letter content in an editable textarea", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => jsonResponse({ coverLetter }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CoverLetterCard jobId="j1" />);
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));

    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(coverLetter.content));
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("lets the user edit the generated content", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => jsonResponse({ coverLetter }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CoverLetterCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(coverLetter.content));

    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "My edited cover letter.");

    expect(textarea).toHaveValue("My edited cover letter.");
  });

  it("copies the current (possibly edited) textarea content, not the original generated text", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => jsonResponse({ coverLetter }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CoverLetterCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(coverLetter.content));

    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "Edited content");

    // Defined after userEvent.setup() deliberately — user-event installs
    // its own navigator.clipboard stub as part of setup(), which would
    // clobber a mock defined any earlier (e.g. in a beforeEach).
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    await user.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copied ✓" })).toBeInTheDocument(),
    );
    expect(writeTextMock).toHaveBeenCalledWith("Edited content");
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
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(coverLetter.content));

    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    await waitFor(() => expect(screen.getByText("Upstream unavailable")).toBeInTheDocument());
    expect(screen.getByRole("textbox")).toHaveValue(coverLetter.content);
  });

  it("resets the textarea to the new content when regenerating succeeds", async () => {
    const user = userEvent.setup();
    const secondLetter: CoverLetterJson = { ...coverLetter, content: "A completely new draft." };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ coverLetter }))
      .mockResolvedValueOnce(jsonResponse({ coverLetter: secondLetter }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CoverLetterCard jobId="j1" />);
    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(coverLetter.content));

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, " edited");
    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("A completely new draft."));
  });
});
