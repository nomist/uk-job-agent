"use client";

import { useState } from "react";

type DeleteStatus = "idle" | "pending" | "error";

interface DeleteButtonProps {
  onDelete: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  pendingLabel?: string;
}

/**
 * Confirm-then-delete button, reused across Saved Jobs/Applications/Resumes.
 * window.confirm() is the confirmation step — no new modal/dialog component
 * needed, and it never fires until the user explicitly clicks. On success,
 * the caller (via onDelete) is expected to remove the item from its own
 * list, so this component doesn't need a persistent "done" state — it
 * simply unmounts along with the deleted item.
 */
export function DeleteButton({
  onDelete,
  confirmMessage,
  label = "Delete",
  pendingLabel = "Deleting…",
}: DeleteButtonProps) {
  const [status, setStatus] = useState<DeleteStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();

  async function handleClick() {
    if (!window.confirm(confirmMessage)) return;

    setStatus("pending");
    setErrorMessage(undefined);
    try {
      await onDelete();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
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
        className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        {status === "pending" ? pendingLabel : status === "error" ? "Retry" : label}
      </button>
    </div>
  );
}
