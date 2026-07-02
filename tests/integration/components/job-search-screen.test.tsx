// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JobSearchScreen } from "@/components/jobs/job-search-screen";
import type { JobSearchResponse } from "@/lib/api/jobs-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("JobSearchScreen", () => {
  it("shows the pre-search prompt without calling the API on mount", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<JobSearchScreen />);

    expect(screen.getByText(/search for your next role/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("searches, shows loading, then renders results", async () => {
    const user = userEvent.setup();
    const body: JobSearchResponse = {
      jobs: [
        {
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
      ],
      totalListingsFound: 1,
      isMock: false,
    };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(body));
    vi.stubGlobal("fetch", fetchMock);

    render(<JobSearchScreen />);

    await user.type(screen.getByPlaceholderText(/job title, skill, or company/i), "engineer");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.searchParams.get("q")).toBe("engineer");
  });

  it("passes filter values (salaryMin, remoteOnly, provider) through to the API call", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({ jobs: [], totalListingsFound: 0, isMock: false }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<JobSearchScreen />);

    await user.type(screen.getByLabelText(/min salary/i), "50000");
    await user.click(screen.getByLabelText(/remote only/i));
    await user.selectOptions(screen.getByLabelText(/provider/i), "REED");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.searchParams.get("salaryMin")).toBe("50000");
    expect(requestedUrl.searchParams.get("remoteOnly")).toBe("true");
    expect(requestedUrl.searchParams.get("provider")).toBe("REED");
  });

  it("shows the error state on a failed search and can retry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: "Upstream unavailable" } }, 502))
      .mockResolvedValueOnce(jsonResponse({ jobs: [], totalListingsFound: 0, isMock: false }));
    vi.stubGlobal("fetch", fetchMock);

    render(<JobSearchScreen />);

    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Upstream unavailable"),
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText(/no jobs found/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows the mock-data notice when the API reports isMock: true", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({
        jobs: [],
        totalListingsFound: 0,
        isMock: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<JobSearchScreen />);

    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/showing sample jobs because api keys are not configured/i),
      ).toBeInTheDocument(),
    );
  });

  it("does not show the mock-data notice when the API reports isMock: false", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({ jobs: [], totalListingsFound: 0, isMock: false }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<JobSearchScreen />);
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => expect(screen.getByText(/no jobs found/i)).toBeInTheDocument());
    expect(
      screen.queryByText(/showing sample jobs because api keys are not configured/i),
    ).not.toBeInTheDocument();
  });

  it("saves a job from search results and immediately reflects it as saved", async () => {
    const user = userEvent.setup();
    const searchBody: JobSearchResponse = {
      jobs: [
        {
          id: "job-42",
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
      ],
      totalListingsFound: 1,
      isMock: false,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/save")) {
        return jsonResponse({
          savedJob: {
            id: "sj1",
            userId: "local-dev-user",
            jobId: "job-42",
            status: "SAVED",
            savedAt: "2026-01-02T00:00:00.000Z",
            notes: null,
          },
        });
      }
      return jsonResponse(searchBody);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<JobSearchScreen />);

    await user.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Saved ✓")).toBeInTheDocument());

    const saveCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/save"));
    expect(saveCall?.[0]).toBe("/api/jobs/job-42/save");
    expect(JSON.parse((saveCall?.[1] as RequestInit).body as string)).toEqual({
      userId: "local-dev-user",
    });
  });

  it("marks a job as applied from search results and immediately shows the applied confirmation", async () => {
    const user = userEvent.setup();
    const searchBody: JobSearchResponse = {
      jobs: [
        {
          id: "job-42",
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
      ],
      totalListingsFound: 1,
      isMock: false,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/applications") {
        return jsonResponse({
          application: {
            id: "app1",
            userId: "local-dev-user",
            jobId: "job-42",
            resumeId: "default-resume",
            status: "APPLIED",
            appliedAt: "2026-01-02T00:00:00.000Z",
            notes: null,
            statusHistory: [],
          },
        });
      }
      return jsonResponse(searchBody);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<JobSearchScreen />);

    await user.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Mark as applied" }));

    await waitFor(() => expect(screen.getByText("Applied ✓")).toBeInTheDocument());

    const applyCall = fetchMock.mock.calls.find((call) => String(call[0]) === "/api/applications");
    expect(JSON.parse((applyCall?.[1] as RequestInit).body as string)).toEqual({
      jobId: "job-42",
      userId: "local-dev-user",
    });
  });
});
