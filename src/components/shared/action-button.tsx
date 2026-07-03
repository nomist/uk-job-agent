"use client";

import { useState } from "react";

type ActionStatus = "idle" | "pending" | "done" | "error";

interface ActionButtonProps {
  onClick: () => Promise<void>;
  idleLabel: string;
  pendingLabel: string;
  doneLabel: string;
}

/** Idle → pending → done/error button, reused wherever a single fire-and-confirm action is needed. */
export function ActionButton({ onClick, idleLabel, pendingLabel, doneLabel }: ActionButtonProps) {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();

  async function handleClick() {
    setStatus("pending");
    setErrorMessage(undefined);
    try {
      await onClick();
      setStatus("done");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <span className="rounded-md border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
        {doneLabel}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status === "error" ? (
        <span className="text-xs text-red-600 dark:text-red-400">{errorMessage}</span>
      ) : null}
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={status === "pending"}
        className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {status === "pending" ? pendingLabel : status === "error" ? "Retry" : idleLabel}
      </button>
    </div>
  );
}
