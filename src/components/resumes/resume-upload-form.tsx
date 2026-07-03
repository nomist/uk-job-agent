"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

interface ResumeUploadFormProps {
  onCreate: (label: string, content: string) => Promise<void>;
}

export function ResumeUploadForm({ onCreate }: ResumeUploadFormProps) {
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>();

  // Reads the raw text of a .txt file into the textarea — not "file
  // parsing" (no PDF/DOCX extraction, per this milestone's scope), just
  // plain text loaded from disk instead of typed/pasted by hand. The
  // textarea remains fully editable either way.
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setContent(text);
    if (!label.trim()) {
      setLabel(file.name.replace(/\.[^./]+$/, ""));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage(undefined);
    try {
      await onCreate(label.trim(), content.trim());
      setLabel("");
      setContent("");
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save resume.");
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Add a resume</h2>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="resumeLabel"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Label
        </label>
        <input
          id="resumeLabel"
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="e.g. General, Frontend-focused"
          required
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="resumeFile"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Upload a text file (optional)
        </label>
        <input
          id="resumeFile"
          type="file"
          accept=".txt,text/plain"
          onChange={(event) => void handleFileChange(event)}
          className="text-sm text-zinc-700 dark:text-zinc-300"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="resumeContent"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Resume content
        </label>
        <textarea
          id="resumeContent"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={10}
          required
          placeholder="Paste or type your resume content here…"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
        />
      </div>

      {status === "error" ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {status === "saving" ? "Saving…" : "Add resume"}
      </button>
    </form>
  );
}
