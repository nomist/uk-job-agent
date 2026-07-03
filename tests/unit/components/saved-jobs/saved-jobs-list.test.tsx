// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SavedJobsList } from "@/components/saved-jobs/saved-jobs-list";
import type { SavedJobWithDetailsJson } from "@/lib/api/saved-jobs-client";

afterEach(() => {
  vi.restoreAllMocks();
});

const savedJob: SavedJobWithDetailsJson = {
  savedJob: {
    id: "sj1",
    userId: "u1",
    jobId: "j1",
    status: "SAVED",
    savedAt: "2026-02-10T00:00:00.000Z",
    notes: null,
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
    salaryRange: { min: 60000, max: 80000, currency: "GBP" },
    employmentType: null,
    workMode: null,
    postedAt: null,
    firstSeenAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-01-01T00:00:00.000Z",
    isExpired: false,
    canonicalJobId: null,
  },
};

describe("SavedJobsList", () => {
  it("shows the loading state", () => {
    render(<SavedJobsList status="loading" savedJobs={[]} onDelete={vi.fn()} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the error state with the given message and a retry button", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <SavedJobsList
        status="error"
        savedJobs={[]}
        errorMessage="Boom"
        onRetry={onRetry}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows an empty state when there are no saved jobs", () => {
    render(<SavedJobsList status="success" savedJobs={[]} onDelete={vi.fn()} />);
    expect(screen.getByText(/no saved jobs yet/i)).toBeInTheDocument();
  });

  it("renders a JobCard with the saved date and no interactive Save control", () => {
    render(<SavedJobsList status="success" savedJobs={[savedJob]} onDelete={vi.fn()} />);

    expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
    expect(screen.getByText(/Saved 10 Feb 2026/)).toBeInTheDocument();
    // Exact match: distinguishes the (absent) interactive "Save" control
    // from the "Remove from saved" delete button, which also matches /save/i.
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("calls onDelete with the saved-job id after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<SavedJobsList status="success" savedJobs={[savedJob]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /remove from saved/i }));

    expect(onDelete).toHaveBeenCalledWith("sj1");
  });

  it("does not call onDelete when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<SavedJobsList status="success" savedJobs={[savedJob]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /remove from saved/i }));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
