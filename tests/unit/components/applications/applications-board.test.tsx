// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationsBoard } from "@/components/applications/applications-board";
import type { ApplicationWithDetailsJson } from "@/lib/api/applications-client";

afterEach(() => {
  vi.restoreAllMocks();
});

function buildItem(
  id: string,
  title: string,
  status: ApplicationWithDetailsJson["application"]["status"],
): ApplicationWithDetailsJson {
  return {
    application: {
      id,
      userId: "u1",
      jobId: id,
      resumeId: "r1",
      status,
      appliedAt: "2026-01-15T00:00:00.000Z",
      notes: null,
      statusHistory: [],
    },
    job: {
      id,
      companyId: "acme",
      provider: "ADZUNA",
      externalId: id,
      title,
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

describe("ApplicationsBoard", () => {
  it("shows the loading state", () => {
    render(
      <ApplicationsBoard
        status="loading"
        applications={[]}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
        updatingApplicationIds={new Set()}
        statusUpdateErrors={{}}
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the error state with a retry button", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ApplicationsBoard
        status="error"
        applications={[]}
        errorMessage="Boom"
        onRetry={onRetry}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
        updatingApplicationIds={new Set()}
        statusUpdateErrors={{}}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows an empty state when there are no applications", () => {
    render(
      <ApplicationsBoard
        status="success"
        applications={[]}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
        updatingApplicationIds={new Set()}
        statusUpdateErrors={{}}
      />,
    );
    expect(screen.getByText(/no applications yet/i)).toBeInTheDocument();
  });

  it("groups applications into status sections, in funnel order, hiding empty groups", () => {
    const applications = [
      buildItem("a1", "Rejected Role", "REJECTED"),
      buildItem("a2", "Applied Role", "APPLIED"),
    ];
    render(
      <ApplicationsBoard
        status="success"
        applications={applications}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
        updatingApplicationIds={new Set()}
        statusUpdateErrors={{}}
      />,
    );

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Applied (1)", "Rejected (1)"]);
    expect(screen.getByText("Applied Role")).toBeInTheDocument();
    expect(screen.getByText("Rejected Role")).toBeInTheDocument();
  });

  it("passes per-application updating state and error messages through", () => {
    const applications = [buildItem("a1", "Some Role", "APPLIED")];
    render(
      <ApplicationsBoard
        status="success"
        applications={applications}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
        updatingApplicationIds={new Set(["a1"])}
        statusUpdateErrors={{ a1: "Invalid transition" }}
      />,
    );

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText("Invalid transition")).toBeInTheDocument();
  });

  it("calls onDelete with the correct application id when a card's Delete is confirmed", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const applications = [
      buildItem("a1", "First Role", "APPLIED"),
      buildItem("a2", "Second Role", "APPLIED"),
    ];
    render(
      <ApplicationsBoard
        status="success"
        applications={applications}
        onStatusChange={vi.fn()}
        onDelete={onDelete}
        updatingApplicationIds={new Set()}
        statusUpdateErrors={{}}
      />,
    );

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[1]);

    expect(onDelete).toHaveBeenCalledWith("a2");
  });
});
