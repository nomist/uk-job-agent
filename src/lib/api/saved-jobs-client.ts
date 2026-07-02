import type { JobSearchResult } from "./jobs-client";

// Local, UI-owned types describing the wire JSON returned by /api/saved-jobs
// and POST /api/jobs/:id/save (see src/app/api/_lib/serializers.ts).

export interface SavedJobRecordJson {
  id: string;
  userId: string;
  jobId: string;
  status: "SAVED" | "DISMISSED";
  savedAt: string;
  notes: string | null;
}

export interface SavedJobWithDetailsJson {
  savedJob: SavedJobRecordJson;
  job: JobSearchResult;
}

export interface ListSavedJobsResponse {
  savedJobs: SavedJobWithDetailsJson[];
}

/** Thrown when a saved-jobs API call responds with a non-OK status. */
export class SavedJobsRequestError extends Error {}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

/** Client-side wrapper around GET /api/saved-jobs — the only way this UI reads saved jobs. */
export async function listSavedJobs(
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ListSavedJobsResponse> {
  const response = await fetchImpl(`/api/saved-jobs?userId=${encodeURIComponent(userId)}`);

  if (!response.ok) {
    throw new SavedJobsRequestError(
      await readErrorMessage(response, `Failed to load saved jobs (status ${response.status})`),
    );
  }

  return (await response.json()) as ListSavedJobsResponse;
}

/** Client-side wrapper around POST /api/jobs/:id/save — the only way this UI saves a job. */
export async function saveJob(
  jobId: string,
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SavedJobRecordJson> {
  const response = await fetchImpl(`/api/jobs/${encodeURIComponent(jobId)}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new SavedJobsRequestError(
      await readErrorMessage(response, `Failed to save job (status ${response.status})`),
    );
  }

  const body = (await response.json()) as { savedJob: SavedJobRecordJson };
  return body.savedJob;
}
