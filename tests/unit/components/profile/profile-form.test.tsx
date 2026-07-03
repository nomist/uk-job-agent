// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/components/profile/profile-form";
import type { ProfileJson } from "@/lib/api/profile-client";

describe("ProfileForm", () => {
  it("renders empty when there is no initial profile", () => {
    render(<ProfileForm initialProfile={null} onSave={vi.fn()} />);

    expect(screen.getByLabelText(/headline/i)).toHaveValue("");
    expect(screen.getByLabelText(/years of experience/i)).toHaveValue(null);
  });

  it("pre-fills fields from an existing profile", () => {
    const profile: ProfileJson = {
      id: "p1",
      userId: "u1",
      headline: "Staff Engineer",
      yearsOfExperience: 8,
      skills: ["TypeScript", "React"],
      preferredLocations: ["London", "Remote"],
      workPreferences: ["REMOTE", "HYBRID"],
      visaStatus: "NO_SPONSORSHIP_NEEDED",
      salaryExpectation: { min: 60000, max: 80000, currency: "GBP" },
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    render(<ProfileForm initialProfile={profile} onSave={vi.fn()} />);

    expect(screen.getByLabelText(/headline/i)).toHaveValue("Staff Engineer");
    expect(screen.getByLabelText(/years of experience/i)).toHaveValue(8);
    expect(screen.getByLabelText(/^skills$/i)).toHaveValue("TypeScript, React");
    expect(screen.getByLabelText(/preferred locations/i)).toHaveValue("London, Remote");
    expect(screen.getByRole("checkbox", { name: "Remote" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Hybrid" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Onsite" })).not.toBeChecked();
    expect(screen.getByLabelText(/visa status/i)).toHaveValue("NO_SPONSORSHIP_NEEDED");
    expect(screen.getByLabelText(/minimum salary/i)).toHaveValue(60000);
  });

  it("submits parsed comma-separated lists, work preferences, and salary as a structured payload", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileForm initialProfile={null} onSave={onSave} />);

    await user.type(screen.getByLabelText(/headline/i), "Senior Engineer");
    await user.type(screen.getByLabelText(/^skills$/i), "React, TypeScript");
    await user.type(screen.getByLabelText(/preferred locations/i), "London, Remote");
    await user.click(screen.getByRole("checkbox", { name: "Remote" }));
    await user.type(screen.getByLabelText(/minimum salary/i), "50000");
    await user.type(screen.getByLabelText(/maximum salary/i), "70000");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        headline: "Senior Engineer",
        skills: ["React", "TypeScript"],
        preferredLocations: ["London", "Remote"],
        workPreferences: ["REMOTE"],
        salaryExpectation: { min: 50000, max: 70000, currency: "GBP" },
      }),
    );
  });

  it("omits salaryExpectation entirely when both min and max are left blank", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileForm initialProfile={null} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].salaryExpectation).toBeUndefined();
  });

  it("shows a saved confirmation on success and a friendly error on failure", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValueOnce(new Error("Invalid years of experience"));
    render(<ProfileForm initialProfile={null} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(screen.getByText("Invalid years of experience")).toBeInTheDocument(),
    );
  });

  it("disables the submit button while saving", async () => {
    const user = userEvent.setup();
    let resolveSave: () => void = () => {};
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(<ProfileForm initialProfile={null} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: /save profile/i }));

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    resolveSave();
  });
});
