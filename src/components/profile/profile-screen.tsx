"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/jobs/error-state";
import { LoadingState } from "@/components/jobs/loading-state";
import {
  getProfile,
  saveProfile,
  type ProfileJson,
  type UpsertProfileInput,
} from "@/lib/api/profile-client";
import { ProfileForm } from "./profile-form";

type ProfileScreenStatus = "loading" | "success" | "error";

export function ProfileScreen() {
  const [status, setStatus] = useState<ProfileScreenStatus>("loading");
  const [profile, setProfile] = useState<ProfileJson | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();

  const fetchProfile = useCallback(async () => {
    try {
      const result = await getProfile();
      setProfile(result);
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
    void fetchProfile();
  }, [fetchProfile]);

  function handleRetry() {
    setStatus("loading");
    setErrorMessage(undefined);
    void fetchProfile();
  }

  async function handleSave(input: UpsertProfileInput) {
    const updated = await saveProfile(input);
    setProfile(updated);
  }

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <LoadingState />
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState message={errorMessage ?? "Unknown error"} onRetry={handleRetry} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Profile</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Used for AI match scoring, cover letters, and CV suggestions.
        </p>
      </div>
      <ProfileForm initialProfile={profile} onSave={handleSave} />
    </main>
  );
}
