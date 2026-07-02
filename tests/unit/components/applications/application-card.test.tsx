// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApplicationCard } from "@/components/applications/application-card";
import type { ApplicationWithDetailsJson } from "@/lib/api/applications-client";

function buildItem(
  overrides: Partial<ApplicationWithDetailsJson["application"]> = {},
): ApplicationWithDetailsJson {
  return {
    application: {
      id: "a1",
      userId: "u1",
      jobId: "j1",
      resumeId: "r1",
      status: "APPLIED",
      appliedAt: "2026-01-15T00:00:00.000Z",
      notes: null,
      statusHistory: [],
      ...overrides,
    },
    job: {
      id: "j1",
      companyId: "acme",
      provider: "ADZUNA",
      externalId: "1",
      title: "Staff Engineer",
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
    },
  };
}

describe("ApplicationCard", () => {
  it("renders job title, company, location, and applied date", () => {
    render(<ApplicationCard item={buildItem()} onStatusChange={vi.fn()} />);

    expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
    expect(screen.getByText("acme")).toBeInTheDocument();
    expect(screen.getByText("London, UK")).toBeInTheDocument();
    expect(screen.getByText(/Applied 15 Jan 2026/)).toBeInTheDocument();
  });

  it("shows the provider badge", () => {
    render(<ApplicationCard item={buildItem()} onStatusChange={vi.fn()} />);
    expect(screen.getByText("Adzuna")).toBeInTheDocument();
  });

  it("shows the current status as the selected option", () => {
    render(<ApplicationCard item={buildItem({ status: "HR_SCREEN" })} onStatusChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveValue("HR_SCREEN");
  });

  it("calls onStatusChange with the newly selected status", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(<ApplicationCard item={buildItem()} onStatusChange={onStatusChange} />);

    await user.selectOptions(screen.getByRole("combobox"), "REJECTED");

    expect(onStatusChange).toHaveBeenCalledWith("REJECTED");
  });

  it("disables the status select while updating", () => {
    render(<ApplicationCard item={buildItem()} onStatusChange={vi.fn()} isUpdating />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("shows an error message when given one", () => {
    render(
      <ApplicationCard
        item={buildItem()}
        onStatusChange={vi.fn()}
        errorMessage="Invalid transition"
      />,
    );
    expect(screen.getByText("Invalid transition")).toBeInTheDocument();
  });
});
