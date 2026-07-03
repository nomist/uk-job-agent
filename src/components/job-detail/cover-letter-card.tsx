"use client";

import { useEffect, useRef, useState } from "react";
import { useAiAction } from "@/components/shared/use-ai-action";
import { generateCoverLetter, type CoverLetterJson } from "@/lib/api/ai-client";

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

interface CoverLetterCardProps {
  jobId: string;
}

export function CoverLetterCard({ jobId }: CoverLetterCardProps) {
  const { status, result, errorMessage, run } = useAiAction<CoverLetterJson>(() =>
    generateCoverLetter(jobId, undefined),
  );

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Cover letter</h2>
        <div className="flex items-center gap-2">
          {result ? <CopyButton text={result.content} /> : null}
          <button
            type="button"
            onClick={() => void run()}
            disabled={status === "loading"}
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {status === "loading"
              ? "Generating…"
              : status === "error"
                ? "Retry"
                : result
                  ? "Regenerate"
                  : "Generate cover letter"}
          </button>
        </div>
      </div>

      {status === "loading" ? (
        <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
          {result ? "Generating a new version…" : "Generating your cover letter…"}
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <pre className="whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {result.content}
        </pre>
      ) : status === "idle" ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Generate a tailored cover letter for this role.
        </p>
      ) : null}
    </section>
  );
}
