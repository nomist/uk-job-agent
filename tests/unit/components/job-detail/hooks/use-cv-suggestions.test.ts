// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCvSuggestions } from "@/components/job-detail/hooks/use-cv-suggestions";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCvSuggestions", () => {
  it("calls POST /api/jobs/:id/cv-suggestions only once run() is invoked", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({
        suggestions: [{ category: "WORDING", text: "Quantify impact.", priority: "MEDIUM" }],
        modelVersion: "gpt-test",
        generatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCvSuggestions("j1"));
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.run();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.result?.suggestions).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs/j1/cv-suggestions", expect.any(Object));
  });
});
