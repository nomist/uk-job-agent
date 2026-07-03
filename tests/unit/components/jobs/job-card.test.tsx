// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobCard } from "@/components/jobs/job-card";
import type { JobSearchResult } from "@/lib/api/jobs-client";

function buildJob(overrides: Partial<JobSearchResult> = {}): JobSearchResult {
  return {
    id: "j1",
    companyId: "acme corp",
    provider: "ADZUNA",
    externalId: "1",
    title: "Staff Software Engineer",
    description: "desc",
    location: { city: "London", region: null, country: "UK", isRemote: false },
    url: "https://example.com/jobs/1",
    salaryRange: { min: 60000, max: 80000, currency: "GBP" },
    employmentType: "FULL_TIME",
    workMode: null,
    postedAt: "2026-01-01T00:00:00.000Z",
    firstSeenAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-01-01T00:00:00.000Z",
    isExpired: false,
    canonicalJobId: null,
    ...overrides,
  };
}

describe("JobCard", () => {
  it("renders title, company, location, and a link to the original listing", () => {
    render(<JobCard job={buildJob()} />);

    expect(screen.getByText("Staff Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("acme corp")).toBeInTheDocument();
    expect(screen.getByText("London, UK")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /view original listing/i });
    expect(link).toHaveAttribute("href", "https://example.com/jobs/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows the salary range when present", () => {
    render(<JobCard job={buildJob()} />);
    expect(screen.getByText("GBP 60,000 - 80,000")).toBeInTheDocument();
  });

  it("omits the salary line entirely when salaryRange is null", () => {
    render(<JobCard job={buildJob({ salaryRange: null })} />);
    expect(screen.queryByText(/GBP/)).not.toBeInTheDocument();
  });

  it("shows a formatted posted date when present", () => {
    render(<JobCard job={buildJob({ postedAt: "2026-03-15T00:00:00.000Z" })} />);
    expect(screen.getByText(/Posted 15 Mar 2026/)).toBeInTheDocument();
  });

  it("omits the posted date when null", () => {
    render(<JobCard job={buildJob({ postedAt: null })} />);
    expect(screen.queryByText(/Posted/)).not.toBeInTheDocument();
  });

  it("shows 'Remote' when isRemote is true and no city is given", () => {
    render(
      <JobCard
        job={buildJob({ location: { city: null, region: null, country: "UK", isRemote: true } })}
      />,
    );
    expect(screen.getByText("Remote")).toBeInTheDocument();
  });

  it("shows the provider badge for REED", () => {
    render(<JobCard job={buildJob({ provider: "REED" })} />);
    expect(screen.getByText("Reed")).toBeInTheDocument();
  });

  it("renders a link to the job detail page for AI actions", () => {
    render(<JobCard job={buildJob({ id: "job-42" })} />);
    const link = screen.getByRole("link", { name: /match score, cover letter/i });
    expect(link).toHaveAttribute("href", "/jobs/job-42");
  });

  it("renders a non-interactive Save placeholder when no onSave handler is given", () => {
    render(<JobCard job={buildJob()} />);
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("calls onSave with the job id and shows a saved confirmation on success", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<JobCard job={buildJob({ id: "job-42" })} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith("job-42");
    await waitFor(() => expect(screen.getByText("Saved ✓")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("shows an error and lets the user retry when onSave rejects", async () => {
    const user = userEvent.setup();
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(undefined);
    render(<JobCard job={buildJob()} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("network down")).toBeInTheDocument());
    const retryButton = screen.getByRole("button", { name: "Retry" });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    await waitFor(() => expect(screen.getByText("Saved ✓")).toBeInTheDocument());
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("shows 'Saved <date>' instead of a Save control when savedAt is provided", () => {
    render(<JobCard job={buildJob()} savedAt="2026-02-10T00:00:00.000Z" onSave={vi.fn()} />);

    expect(screen.getByText(/Saved 10 Feb 2026/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("does not render a Mark as applied control when onMarkApplied is not given", () => {
    render(<JobCard job={buildJob()} />);
    expect(screen.queryByRole("button", { name: /mark as applied/i })).not.toBeInTheDocument();
  });

  it("calls onMarkApplied with the job id and shows an applied confirmation on success", async () => {
    const user = userEvent.setup();
    const onMarkApplied = vi.fn().mockResolvedValue(undefined);
    render(<JobCard job={buildJob({ id: "job-42" })} onMarkApplied={onMarkApplied} />);

    await user.click(screen.getByRole("button", { name: "Mark as applied" }));

    expect(onMarkApplied).toHaveBeenCalledWith("job-42");
    await waitFor(() => expect(screen.getByText("Applied ✓")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Mark as applied" })).not.toBeInTheDocument();
  });

  it("shows an error and lets the user retry when onMarkApplied rejects", async () => {
    const user = userEvent.setup();
    const onMarkApplied = vi
      .fn()
      .mockRejectedValueOnce(new Error("already applied"))
      .mockResolvedValueOnce(undefined);
    render(<JobCard job={buildJob()} onMarkApplied={onMarkApplied} />);

    await user.click(screen.getByRole("button", { name: "Mark as applied" }));

    await waitFor(() => expect(screen.getByText("already applied")).toBeInTheDocument());
    const retryButton = screen.getByRole("button", { name: "Retry" });

    await user.click(retryButton);
    await waitFor(() => expect(screen.getByText("Applied ✓")).toBeInTheDocument());
    expect(onMarkApplied).toHaveBeenCalledTimes(2);
  });

  it("shows both the saved indicator and a functional Mark as applied control on the Saved Jobs screen", async () => {
    const user = userEvent.setup();
    const onMarkApplied = vi.fn().mockResolvedValue(undefined);
    render(
      <JobCard job={buildJob()} savedAt="2026-02-10T00:00:00.000Z" onMarkApplied={onMarkApplied} />,
    );

    expect(screen.getByText(/Saved 10 Feb 2026/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark as applied" }));
    expect(onMarkApplied).toHaveBeenCalled();
  });

  it("does not render match-score info when matchScore is not given", () => {
    render(<JobCard job={buildJob()} />);
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
  });

  it("renders the score, reason, and missing skills when matchScore is given", () => {
    render(
      <JobCard
        job={buildJob()}
        matchScore={{ score: 82, reason: "Strong skill overlap.", missingSkills: ["Kubernetes"] }}
      />,
    );

    expect(screen.getByText("82/100")).toBeInTheDocument();
    expect(screen.getByText("Strong skill overlap.")).toBeInTheDocument();
    expect(screen.getByText("Missing skills: Kubernetes")).toBeInTheDocument();
  });

  it("omits the missing-skills line when there are none", () => {
    render(
      <JobCard
        job={buildJob()}
        matchScore={{ score: 90, reason: "Great fit.", missingSkills: [] }}
      />,
    );
    expect(screen.queryByText(/Missing skills/)).not.toBeInTheDocument();
  });

  it("does not render a Dismiss control when onDismiss is not given", () => {
    render(<JobCard job={buildJob()} />);
    expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it("calls onDismiss with the job id and shows a dismissed confirmation on success", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn().mockResolvedValue(undefined);
    render(<JobCard job={buildJob({ id: "job-42" })} onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledWith("job-42");
    await waitFor(() => expect(screen.getByText("Dismissed ✓")).toBeInTheDocument());
  });
});
