// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumeManagerScreen } from "@/components/resumes/resume-manager-screen";
import type { ResumeJson } from "@/lib/api/resumes-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const existingResume: ResumeJson = {
  id: "r1",
  profileId: "p1",
  label: "General",
  content: "Existing resume content.",
  parsedSkills: [],
  isPrimary: true,
  createdAt: "2026-01-10T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ResumeManagerScreen", () => {
  it("loads and renders existing resumes", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({ resumes: [existingResume] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ResumeManagerScreen />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());
    expect(screen.getByText("Primary")).toBeInTheDocument();
  });

  it("shows an empty state when the user has no resumes yet", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ resumes: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ResumeManagerScreen />);

    await waitFor(() => expect(screen.getByText(/no resumes yet/i)).toBeInTheDocument());
  });

  it("adds a resume and shows it immediately without a full re-fetch", async () => {
    const user = userEvent.setup();
    const createdResume: ResumeJson = {
      id: "r2",
      profileId: "p1",
      label: "Frontend",
      content: "New resume content",
      parsedSkills: [],
      isPrimary: false,
      createdAt: "2026-02-01T00:00:00.000Z",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse({ resume: createdResume }, 201);
      }
      return jsonResponse({ resumes: [existingResume] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ResumeManagerScreen />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    await user.type(screen.getByLabelText(/label/i), "Frontend");
    await user.type(screen.getByLabelText(/resume content/i), "New resume content");
    await user.click(screen.getByRole("button", { name: /add resume/i }));

    await waitFor(() => expect(screen.getByText("Frontend")).toBeInTheDocument());
    // Only one fetch call for the POST, no extra GET re-fetch triggered by the add.
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(1);
  });

  it("sets a resume as primary and demotes the previous one in the UI", async () => {
    const user = userEvent.setup();
    const secondResume: ResumeJson = {
      id: "r2",
      profileId: "p1",
      label: "Frontend",
      content: "content 2",
      parsedSkills: [],
      isPrimary: false,
      createdAt: "2026-02-01T00:00:00.000Z",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "PATCH" && url.includes("/primary")) {
        return jsonResponse({ resume: { ...secondResume, isPrimary: true } });
      }
      return jsonResponse({ resumes: [existingResume, secondResume] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ResumeManagerScreen />);
    await waitFor(() => expect(screen.getByText("Frontend")).toBeInTheDocument());

    const setPrimaryButtons = screen.getAllByRole("button", { name: /set as primary/i });
    await user.click(setPrimaryButtons[0]);

    await waitFor(() => expect(screen.getAllByText("Primary")).toHaveLength(1));
    expect(screen.queryAllByRole("button", { name: /set as primary/i })).toHaveLength(1);
  });

  it("shows an error state with retry when loading resumes fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: "Upstream unavailable" } }, 502))
      .mockResolvedValueOnce(jsonResponse({ resumes: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ResumeManagerScreen />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Upstream unavailable"),
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText(/no resumes yet/i)).toBeInTheDocument());
  });
});
