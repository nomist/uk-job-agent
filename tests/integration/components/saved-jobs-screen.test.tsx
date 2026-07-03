// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SavedJobsScreen } from "@/components/saved-jobs/saved-jobs-screen";
import type { ListSavedJobsResponse } from "@/lib/api/saved-jobs-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const savedJobsBody: ListSavedJobsResponse = {
  savedJobs: [
    {
      savedJob: {
        id: "sj1",
        userId: "local-dev-user",
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
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SavedJobsScreen", () => {
  it("loads and renders saved jobs on mount", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(savedJobsBody));
    vi.stubGlobal("fetch", fetchMock);

    render(<SavedJobsScreen />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    expect(screen.getByText(/Saved 10 Feb 2026/)).toBeInTheDocument();

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/saved-jobs");
    expect(requestedUrl.searchParams.get("userId")).toBe("local-dev-user");
  });

  it("shows the empty state when there are no saved jobs", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ savedJobs: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SavedJobsScreen />);

    await waitFor(() => expect(screen.getByText(/no saved jobs yet/i)).toBeInTheDocument());
  });

  it("shows an error state and retries on failure", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: "Upstream unavailable" } }, 502))
      .mockResolvedValueOnce(jsonResponse(savedJobsBody));
    vi.stubGlobal("fetch", fetchMock);

    render(<SavedJobsScreen />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Upstream unavailable"),
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks a saved job as applied and immediately shows the applied confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/applications") {
        return jsonResponse({
          application: {
            id: "app1",
            userId: "local-dev-user",
            jobId: "j1",
            resumeId: "default-resume",
            status: "APPLIED",
            appliedAt: "2026-02-11T00:00:00.000Z",
            notes: null,
            statusHistory: [],
          },
        });
      }
      return jsonResponse(savedJobsBody);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SavedJobsScreen />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Mark as applied" }));

    await waitFor(() => expect(screen.getByText("Applied ✓")).toBeInTheDocument());
    // The saved indicator should still be visible alongside it.
    expect(screen.getByText(/Saved 10 Feb 2026/)).toBeInTheDocument();

    const applyCall = fetchMock.mock.calls.find((call) => String(call[0]) === "/api/applications");
    expect(JSON.parse((applyCall?.[1] as RequestInit).body as string)).toEqual({
      jobId: "j1",
      userId: "local-dev-user",
    });
  });

  it("removes a saved job from the list immediately after a confirmed delete", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/saved-jobs/sj1") && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      return jsonResponse(savedJobsBody);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SavedJobsScreen />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /remove from saved/i }));

    await waitFor(() => expect(screen.getByText(/no saved jobs yet/i)).toBeInTheDocument());
    const deleteCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("/saved-jobs/sj1"),
    );
    expect(deleteCall?.[1]?.method).toBe("DELETE");
  });

  it("does not remove the item when the delete confirmation is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse(savedJobsBody),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SavedJobsScreen />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /remove from saved/i }));

    expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE")).toBe(false);
  });
});
