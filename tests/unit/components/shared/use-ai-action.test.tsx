// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAiAction } from "@/components/shared/use-ai-action";

describe("useAiAction", () => {
  it("starts idle and never calls the action automatically", () => {
    const action = vi.fn().mockResolvedValue("result");
    const { result } = renderHook(() => useAiAction(action));

    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeUndefined();
    expect(action).not.toHaveBeenCalled();
  });

  it("transitions to loading then success, storing the result", async () => {
    const action = vi.fn().mockResolvedValue("the result");
    const { result } = renderHook(() => useAiAction(action));

    let runPromise: Promise<void>;
    act(() => {
      runPromise = result.current.run();
    });
    expect(result.current.status).toBe("loading");

    await act(async () => {
      await runPromise;
    });

    expect(result.current.status).toBe("success");
    expect(result.current.result).toBe("the result");
  });

  it("transitions to error with a message on rejection", async () => {
    const action = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useAiAction(action));

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe("boom");
  });

  it("preserves the previous successful result after a failed retry", async () => {
    const action = vi.fn().mockResolvedValueOnce("first").mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useAiAction(action));

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.result).toBe("first");

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.result).toBe("first");
    expect(result.current.errorMessage).toBe("boom");
  });

  it("replaces the previous result once a retry succeeds", async () => {
    const action = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    const { result } = renderHook(() => useAiAction(action));

    await act(async () => {
      await result.current.run();
    });
    await act(async () => {
      await result.current.run();
    });

    await waitFor(() => expect(result.current.result).toBe("second"));
    expect(result.current.status).toBe("success");
  });
});
