// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResumeCard } from "@/components/resumes/resume-card";
import type { ResumeJson } from "@/lib/api/resumes-client";

function buildResume(overrides: Partial<ResumeJson> = {}): ResumeJson {
  return {
    id: "r1",
    profileId: "p1",
    label: "General",
    content: "Short resume content.",
    parsedSkills: [],
    isPrimary: false,
    createdAt: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("ResumeCard", () => {
  it("renders the label, created date, and content preview", () => {
    render(<ResumeCard resume={buildResume()} onSetPrimary={vi.fn()} />);

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText(/Added 15 Jan 2026/)).toBeInTheDocument();
    expect(screen.getByText("Short resume content.")).toBeInTheDocument();
  });

  it("truncates long content with an ellipsis", () => {
    const longContent = "x".repeat(250);
    render(<ResumeCard resume={buildResume({ content: longContent })} onSetPrimary={vi.fn()} />);

    expect(screen.getByText(`${"x".repeat(200)}…`)).toBeInTheDocument();
  });

  it("shows a Primary badge and no button when already primary", () => {
    render(<ResumeCard resume={buildResume({ isPrimary: true })} onSetPrimary={vi.fn()} />);

    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /set as primary/i })).not.toBeInTheDocument();
  });

  it("calls onSetPrimary with the resume id when clicked", async () => {
    const user = userEvent.setup();
    const onSetPrimary = vi.fn().mockResolvedValue(undefined);
    render(<ResumeCard resume={buildResume({ id: "resume-42" })} onSetPrimary={onSetPrimary} />);

    await user.click(screen.getByRole("button", { name: /set as primary/i }));

    expect(onSetPrimary).toHaveBeenCalledWith("resume-42");
  });

  it("shows a friendly error message when setting primary fails", async () => {
    const user = userEvent.setup();
    const onSetPrimary = vi.fn().mockRejectedValueOnce(new Error("Failed to set primary resume"));
    render(<ResumeCard resume={buildResume()} onSetPrimary={onSetPrimary} />);

    await user.click(screen.getByRole("button", { name: /set as primary/i }));

    await waitFor(() =>
      expect(screen.getByText("Failed to set primary resume")).toBeInTheDocument(),
    );
  });
});
