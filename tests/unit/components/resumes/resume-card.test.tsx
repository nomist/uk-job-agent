// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumeCard } from "@/components/resumes/resume-card";
import type { ResumeJson, UpdateResumeInput } from "@/lib/api/resumes-client";

afterEach(() => {
  vi.restoreAllMocks();
});

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

function renderCard(
  resume: ResumeJson,
  overrides: {
    onSetPrimary?: (resumeId: string) => Promise<void>;
    onUpdate?: (resumeId: string, input: UpdateResumeInput) => Promise<void>;
    onDelete?: (resumeId: string) => Promise<void>;
  } = {},
) {
  return render(
    <ResumeCard
      resume={resume}
      onSetPrimary={overrides.onSetPrimary ?? vi.fn()}
      onUpdate={overrides.onUpdate ?? vi.fn().mockResolvedValue(undefined)}
      onDelete={overrides.onDelete ?? vi.fn()}
    />,
  );
}

describe("ResumeCard", () => {
  it("renders the label, created date, and content preview", () => {
    renderCard(buildResume());

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText(/Added 15 Jan 2026/)).toBeInTheDocument();
    expect(screen.getByText("Short resume content.")).toBeInTheDocument();
  });

  it("truncates long content with an ellipsis", () => {
    const longContent = "x".repeat(250);
    renderCard(buildResume({ content: longContent }));

    expect(screen.getByText(`${"x".repeat(200)}…`)).toBeInTheDocument();
  });

  it("shows a Primary badge and no button when already primary", () => {
    renderCard(buildResume({ isPrimary: true }));

    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /set as primary/i })).not.toBeInTheDocument();
  });

  it("calls onSetPrimary with the resume id when clicked", async () => {
    const user = userEvent.setup();
    const onSetPrimary = vi.fn().mockResolvedValue(undefined);
    renderCard(buildResume({ id: "resume-42" }), { onSetPrimary });

    await user.click(screen.getByRole("button", { name: /set as primary/i }));

    expect(onSetPrimary).toHaveBeenCalledWith("resume-42");
  });

  it("shows a friendly error message when setting primary fails", async () => {
    const user = userEvent.setup();
    const onSetPrimary = vi.fn().mockRejectedValueOnce(new Error("Failed to set primary resume"));
    renderCard(buildResume(), { onSetPrimary });

    await user.click(screen.getByRole("button", { name: /set as primary/i }));

    await waitFor(() =>
      expect(screen.getByText("Failed to set primary resume")).toBeInTheDocument(),
    );
  });

  it("shows parsed skills when present", () => {
    renderCard(buildResume({ parsedSkills: ["TypeScript", "Kubernetes"] }));
    expect(screen.getByText("Skills: TypeScript, Kubernetes")).toBeInTheDocument();
  });

  it("calls onDelete with the resume id after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderCard(buildResume({ id: "resume-42" }), { onDelete });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith("resume-42");
  });

  describe("edit mode", () => {
    it("switches to an editable form with the current values prefilled", async () => {
      const user = userEvent.setup();
      renderCard(buildResume({ label: "Old label", content: "Old content", parsedSkills: ["Go"] }));

      await user.click(screen.getByRole("button", { name: "Edit" }));

      expect(screen.getByDisplayValue("Old label")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Old content")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Go")).toBeInTheDocument();
    });

    it("calls onUpdate with the edited fields and returns to view mode on success", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(undefined);
      renderCard(buildResume({ id: "r1", label: "Old label" }), { onUpdate });

      await user.click(screen.getByRole("button", { name: "Edit" }));
      const labelInput = screen.getByDisplayValue("Old label");
      await user.clear(labelInput);
      await user.type(labelInput, "New label");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith(
          "r1",
          expect.objectContaining({ label: "New label" }),
        ),
      );
      expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    });

    it("parses the skills input as a comma-separated list", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(undefined);
      renderCard(buildResume({ id: "r1" }), { onUpdate });

      await user.click(screen.getByRole("button", { name: "Edit" }));
      const skillsInput = screen.getByLabelText(/skills/i);
      await user.clear(skillsInput);
      await user.type(skillsInput, "Go, Kubernetes,  Docker ");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith(
          "r1",
          expect.objectContaining({ parsedSkills: ["Go", "Kubernetes", "Docker"] }),
        ),
      );
    });

    it("discards changes and returns to view mode on Cancel", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      renderCard(buildResume({ label: "Original" }), { onUpdate });

      await user.click(screen.getByRole("button", { name: "Edit" }));
      const labelInput = screen.getByDisplayValue("Original");
      await user.clear(labelInput);
      await user.type(labelInput, "Discarded edit");
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.getByText("Original")).toBeInTheDocument();
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("shows an error and stays in edit mode when onUpdate fails", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockRejectedValue(new Error("Failed to save changes"));
      renderCard(buildResume(), { onUpdate });

      await user.click(screen.getByRole("button", { name: "Edit" }));
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(screen.getByText("Failed to save changes")).toBeInTheDocument());
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });
  });
});
