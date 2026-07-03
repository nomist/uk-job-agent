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
  vi.restoreAllMocks();
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

  it("edits a resume's label/content and shows the update immediately", async () => {
    const user = userEvent.setup();
    const updatedResume: ResumeJson = { ...existingResume, label: "Updated label" };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/resumes/r1" && init?.method === "PATCH") {
        return jsonResponse({ resume: updatedResume });
      }
      return jsonResponse({ resumes: [existingResume] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ResumeManagerScreen />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const labelInput = screen.getByDisplayValue("General");
    await user.clear(labelInput);
    await user.type(labelInput, "Updated label");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Updated label")).toBeInTheDocument());
    const patchCall = fetchMock.mock.calls.find(
      (call) => String(call[0]) === "/api/resumes/r1" && call[1]?.method === "PATCH",
    );
    expect(JSON.parse((patchCall?.[1] as RequestInit).body as string)).toEqual({
      label: "Updated label",
      content: "Existing resume content.",
      parsedSkills: [],
    });
  });

  it("removes a resume from the list after a confirmed delete", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let deleted = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/resumes/r1" && init?.method === "DELETE") {
        deleted = true;
        return new Response(null, { status: 204 });
      }
      return jsonResponse({ resumes: deleted ? [] : [existingResume] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ResumeManagerScreen />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.getByText(/no resumes yet/i)).toBeInTheDocument());
  });

  it("does not delete the resume when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ resumes: [existingResume] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ResumeManagerScreen />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE")).toBe(false);
  });
});
