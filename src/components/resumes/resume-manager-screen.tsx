"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/jobs/empty-state";
import { ErrorState } from "@/components/jobs/error-state";
import { LoadingState } from "@/components/jobs/loading-state";
import {
  createResume,
  listResumes,
  setPrimaryResume,
  type ResumeJson,
} from "@/lib/api/resumes-client";
import { ResumeCard } from "./resume-card";
import { ResumeUploadForm } from "./resume-upload-form";

type ResumeManagerStatus = "loading" | "success" | "error";

export function ResumeManagerScreen() {
  const [status, setStatus] = useState<ResumeManagerStatus>("loading");
  const [resumes, setResumes] = useState<ResumeJson[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  const fetchResumes = useCallback(async () => {
    try {
      const result = await listResumes();
      setResumes(result);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount is a legitimate effect — see saved-jobs-screen.tsx for
    // why react-hooks/set-state-in-effect flags it anyway.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchResumes();
  }, [fetchResumes]);

  function handleRetry() {
    setStatus("loading");
    setErrorMessage(undefined);
    void fetchResumes();
  }

  async function handleCreate(label: string, content: string) {
    const created = await createResume(label, content);
    setResumes((current) => [
      created,
      ...current.map((resume) => (created.isPrimary ? { ...resume, isPrimary: false } : resume)),
    ]);
  }

  async function handleSetPrimary(resumeId: string) {
    const updated = await setPrimaryResume(resumeId);
    setResumes((current) =>
      current.map((resume) =>
        resume.id === updated.id ? updated : { ...resume, isPrimary: false },
      ),
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Resume Manager</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Upload or paste resume text. Your primary resume is used by default for AI actions.
        </p>
      </div>

      <ResumeUploadForm onCreate={handleCreate} />

      {status === "loading" ? <LoadingState /> : null}
      {status === "error" ? (
        <ErrorState message={errorMessage ?? "Unknown error"} onRetry={handleRetry} />
      ) : null}
      {status === "success" && resumes.length === 0 ? (
        <EmptyState
          title="No resumes yet"
          description="Add your first resume above to get started."
        />
      ) : null}
      {status === "success" && resumes.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {resumes.map((resume) => (
            <li key={resume.id}>
              <ResumeCard resume={resume} onSetPrimary={handleSetPrimary} />
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
