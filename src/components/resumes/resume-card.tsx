"use client";

import { useState } from "react";
import { formatDate } from "@/components/shared/job-display";
import type { ResumeJson } from "@/lib/api/resumes-client";

const PREVIEW_LENGTH = 200;

interface ResumeCardProps {
  resume: ResumeJson;
  onSetPrimary: (resumeId: string) => Promise<void>;
}

export function ResumeCard({ resume, onSetPrimary }: ResumeCardProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>();

  async function handleSetPrimary() {
    setStatus("saving");
    setErrorMessage(undefined);
    try {
      await onSetPrimary(resume.id);
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to set as primary.");
      setStatus("error");
    }
  }

  const preview =
    resume.content.length > PREVIEW_LENGTH
      ? `${resume.content.slice(0, PREVIEW_LENGTH)}…`
      : resume.content;
  const createdOn = formatDate(resume.createdAt);

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {resume.label}
          </h3>
          {createdOn ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Added {createdOn}</p>
          ) : null}
        </div>
        {resume.isPrimary ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Primary
          </span>
        ) : null}
      </div>

      <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{preview}</p>

      {status === "error" ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      {!resume.isPrimary ? (
        <button
          type="button"
          onClick={() => void handleSetPrimary()}
          disabled={status === "saving"}
          className="self-start rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {status === "saving" ? "Setting…" : "Set as primary"}
        </button>
      ) : null}
    </article>
  );
}
