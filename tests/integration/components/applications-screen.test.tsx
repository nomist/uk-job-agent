// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationsScreen } from "@/components/applications/applications-screen";
import type { ListApplicationsResponse } from "@/lib/api/applications-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const applicationsBody: ListApplicationsResponse = {
  applications: [
    {
      application: {
        id: "a1",
        userId: "local-dev-user",
        jobId: "j1",
        resumeId: "r1",
        status: "APPLIED",
        appliedAt: "2026-01-15T00:00:00.000Z",
        notes: null,
        statusHistory: [],
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
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ApplicationsScreen", () => {
  it("loads and renders applications grouped by status on mount", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(applicationsBody));
    vi.stubGlobal("fetch", fetchMock);

    render(<ApplicationsScreen />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 2, name: "Applied (1)" })).toBeInTheDocument();

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/applications");
    expect(requestedUrl.searchParams.get("userId")).toBe("local-dev-user");
  });

  it("shows the empty state when there are no applications", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({ applications: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ApplicationsScreen />);

    await waitFor(() => expect(screen.getByText(/no applications yet/i)).toBeInTheDocument());
  });

  it("shows an error state and retries on failure", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: "Upstream unavailable" } }, 502))
      .mockResolvedValueOnce(jsonResponse(applicationsBody));
    vi.stubGlobal("fetch", fetchMock);

    render(<ApplicationsScreen />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Upstream unavailable"),
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("optimistically moves an application to its new status group, then reconciles with the server", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/status")) {
        return jsonResponse({
          application: { ...applicationsBody.applications[0].application, status: "HR_SCREEN" },
        });
      }
      return jsonResponse(applicationsBody);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ApplicationsScreen />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    await user.selectOptions(screen.getByRole("combobox"), "HR_SCREEN");

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2, name: "HR Screen (1)" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("heading", { level: 2, name: /^Applied/ })).not.toBeInTheDocument();
  });

  it("reverts the optimistic update and shows an error when the status update fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/status")) {
        return jsonResponse({ error: { message: "Cannot transition from APPLIED to SAVED" } }, 409);
      }
      return jsonResponse(applicationsBody);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ApplicationsScreen />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    await user.selectOptions(screen.getByRole("combobox"), "SAVED");

    await waitFor(() =>
      expect(screen.getByText("Cannot transition from APPLIED to SAVED")).toBeInTheDocument(),
    );
    // Reverted back under "Applied", not left under "Saved".
    expect(screen.getByRole("heading", { level: 2, name: "Applied (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: /^Saved/ })).not.toBeInTheDocument();
  });

  it("removes an application from the board immediately after a confirmed delete", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/applications/a1") && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      return jsonResponse(applicationsBody);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ApplicationsScreen />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.getByText(/no applications yet/i)).toBeInTheDocument());
    const deleteCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("/applications/a1"),
    );
    expect(deleteCall?.[1]?.method).toBe("DELETE");
  });

  it("does not remove the application when the delete confirmation is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse(applicationsBody),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ApplicationsScreen />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE")).toBe(false);
  });
});
