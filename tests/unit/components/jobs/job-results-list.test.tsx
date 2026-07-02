// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobResultsList } from "@/components/jobs/job-results-list";
import type { JobSearchResult } from "@/lib/api/jobs-client";

const job: JobSearchResult = {
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
};

describe("JobResultsList", () => {
  it("shows the loading state", () => {
    render(<JobResultsList status="loading" jobs={[]} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the error state with the given message and a retry button", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<JobResultsList status="error" jobs={[]} errorMessage="Boom" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the pre-search empty state when idle", () => {
    render(<JobResultsList status="idle" jobs={[]} />);
    expect(screen.getByText(/search for your next role/i)).toBeInTheDocument();
  });

  it("shows the no-results empty state after a successful empty search", () => {
    render(<JobResultsList status="success" jobs={[]} />);
    expect(screen.getByText(/no jobs found/i)).toBeInTheDocument();
  });

  it("renders a JobCard per job on success", () => {
    render(<JobResultsList status="success" jobs={[job]} />);
    expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
  });

  it("passes onSaveJob through to each JobCard's Save button", async () => {
    const user = userEvent.setup();
    const onSaveJob = vi.fn().mockResolvedValue(undefined);
    render(<JobResultsList status="success" jobs={[job]} onSaveJob={onSaveJob} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSaveJob).toHaveBeenCalledWith("j1");
  });
});
