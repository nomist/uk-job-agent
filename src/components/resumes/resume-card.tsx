"use client";

import { useState } from "react";
import { formatDate } from "@/components/shared/job-display";
import { DeleteButton } from "@/components/shared/delete-button";
import type { ResumeJson, UpdateResumeInput } from "@/lib/api/resumes-client";

const PREVIEW_LENGTH = 200;

interface ResumeCardProps {
  resume: ResumeJson;
  onSetPrimary: (resumeId: string) => Promise<void>;
  onUpdate: (resumeId: string, input: UpdateResumeInput) => Promise<void>;
  onDelete: (resumeId: string) => Promise<void>;
}

function parseSkillsInput(value: string): string[] {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);
}

export function ResumeCard({ resume, onSetPrimary, onUpdate, onDelete }: ResumeCardProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [labelInput, setLabelInput] = useState(resume.label);
  const [contentInput, setContentInput] = useState(resume.content);
  const [skillsInput, setSkillsInput] = useState(resume.parsedSkills.join(", "));

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

  function handleStartEdit() {
    setLabelInput(resume.label);
    setContentInput(resume.content);
    setSkillsInput(resume.parsedSkills.join(", "));
    setErrorMessage(undefined);
    setStatus("idle");
    setMode("edit");
  }

  function handleCancelEdit() {
    setMode("view");
  }

  async function handleSaveEdit() {
    setStatus("saving");
    setErrorMessage(undefined);
    try {
      await onUpdate(resume.id, {
        label: labelInput,
        content: contentInput,
        parsedSkills: parseSkillsInput(skillsInput),
      });
      setStatus("idle");
      setMode("view");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save changes.");
      setStatus("error");
    }
  }

  const preview =
    resume.content.length > PREVIEW_LENGTH
      ? `${resume.content.slice(0, PREVIEW_LENGTH)}…`
      : resume.content;
  const createdOn = formatDate(resume.createdAt);

  if (mode === "edit") {
    return (
      <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Label</span>
          <input
            type="text"
            value={labelInput}
            onChange={(event) => setLabelInput(event.target.value)}
            disabled={status === "saving"}
            className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Content</span>
          <textarea
            value={contentInput}
            onChange={(event) => setContentInput(event.target.value)}
            disabled={status === "saving"}
            rows={8}
            className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Skills (comma separated)</span>
          <input
            type="text"
            value={skillsInput}
            onChange={(event) => setSkillsInput(event.target.value)}
            disabled={status === "saving"}
            className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        {status === "error" ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSaveEdit()}
            disabled={status === "saving"}
            className="rounded-md border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={status === "saving"}
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </article>
    );
  }

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

      {resume.parsedSkills.length > 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Skills: {resume.parsedSkills.join(", ")}
        </p>
      ) : null}

      {status === "error" ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {!resume.isPrimary ? (
          <button
            type="button"
            onClick={() => void handleSetPrimary()}
            disabled={status === "saving"}
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {status === "saving" ? "Setting…" : "Set as primary"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleStartEdit}
          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Edit
        </button>
        <span className="flex-1" />
        <DeleteButton
          onDelete={() => onDelete(resume.id)}
          confirmMessage={`Delete "${resume.label}"? This can't be undone.`}
        />
      </div>
    </article>
  );
}
