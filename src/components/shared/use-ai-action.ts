"use client";

import { useState } from "react";

export type AiActionStatus = "idle" | "loading" | "success" | "error";

export interface UseAiActionResult<T> {
  status: AiActionStatus;
  /** The last successful result — preserved across a failed retry, only replaced by a new success. */
  result: T | undefined;
  errorMessage: string | undefined;
  /** Never called automatically — only ever invoked from a button's onClick. */
  run: () => Promise<void>;
}

/**
 * Shared idle/loading/success/error state machine for the three AI action
 * cards (Match score, Cover letter, Improve CV). Not "business logic" —
 * the actual AI computation happens server-side via the existing use
 * cases; this only tracks UI request state, and deliberately never clears
 * `result` on error so a previous successful result stays visible while a
 * retry is in flight or after it fails.
 */
export function useAiAction<T>(action: () => Promise<T>): UseAiActionResult<T> {
  const [status, setStatus] = useState<AiActionStatus>("idle");
  const [result, setResult] = useState<T>();
  const [errorMessage, setErrorMessage] = useState<string>();

  async function run() {
    setStatus("loading");
    setErrorMessage(undefined);
    try {
      const next = await action();
      setResult(next);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return { status, result, errorMessage, run };
}
