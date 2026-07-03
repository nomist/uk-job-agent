// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCoverLetter } from "@/components/job-detail/hooks/use-cover-letter";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCoverLetter", () => {
  it("calls POST /api/jobs/:id/cover-letter only once run() is invoked", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({
        coverLetter: {
          content: "Dear Hiring Manager...",
          modelVersion: "gpt-test",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCoverLetter("j1"));
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.run();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.result?.content).toBe("Dear Hiring Manager...");
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs/j1/cover-letter", expect.any(Object));
  });

  it("includes the requested tone in the request body", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({
        coverLetter: {
          content: "x",
          modelVersion: "gpt-test",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCoverLetter("j1", "ENTHUSIASTIC"));

    await act(async () => {
      await result.current.run();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tone).toBe("ENTHUSIASTIC");
  });
});
