// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileScreen } from "@/components/profile/profile-screen";
import type { ProfileJson } from "@/lib/api/profile-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const profile: ProfileJson = {
  id: "p1",
  userId: "local-dev-user",
  headline: "Staff Engineer",
  yearsOfExperience: 8,
  skills: ["TypeScript"],
  preferredLocations: ["London"],
  workPreferences: ["REMOTE"],
  visaStatus: "UNKNOWN",
  salaryExpectation: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProfileScreen", () => {
  it("loads and pre-fills the form with an existing profile", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ profile }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfileScreen />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/headline/i)).toHaveValue("Staff Engineer"));

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/profile");
  });

  it("renders an empty form when the user has no profile yet", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ profile: null }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfileScreen />);

    await waitFor(() => expect(screen.getByLabelText(/headline/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/headline/i)).toHaveValue("");
  });

  it("shows an error state with retry when loading the profile fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: "Upstream unavailable" } }, 502))
      .mockResolvedValueOnce(jsonResponse({ profile: null }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfileScreen />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Upstream unavailable"),
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByLabelText(/headline/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("saves changes and shows a confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return jsonResponse({ profile: { ...profile, headline: "Updated headline" } });
      }
      return jsonResponse({ profile: null });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByLabelText(/headline/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/headline/i), "Updated headline");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(screen.getByText("Profile saved.")).toBeInTheDocument());
  });
});
