import { CURRENT_USER_ID } from "./current-user";

// Local, UI-owned type describing the wire JSON returned by
// GET/POST /api/resumes and PATCH /api/resumes/:id/primary (see
// src/app/api/_lib/serializers.ts).
export interface ResumeJson {
  id: string;
  profileId: string;
  label: string;
  content: string;
  parsedSkills: string[];
  isPrimary: boolean;
  createdAt: string;
}

/** Thrown when a resumes API call responds with a non-OK status. */
export class ResumesRequestError extends Error {}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

/** Client-side wrapper around GET /api/resumes. */
export async function listResumes(fetchImpl: typeof fetch = fetch): Promise<ResumeJson[]> {
  const response = await fetchImpl(`/api/resumes?userId=${encodeURIComponent(CURRENT_USER_ID)}`);

  if (!response.ok) {
    throw new ResumesRequestError(
      await readErrorMessage(response, `Failed to load resumes (status ${response.status})`),
    );
  }

  const body = (await response.json()) as { resumes: ResumeJson[] };
  return body.resumes;
}

/** Client-side wrapper around POST /api/resumes — the upload/manual text entry flow. */
export async function createResume(
  label: string,
  content: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResumeJson> {
  const response = await fetchImpl("/api/resumes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: CURRENT_USER_ID, label, content }),
  });

  if (!response.ok) {
    throw new ResumesRequestError(
      await readErrorMessage(response, `Failed to save resume (status ${response.status})`),
    );
  }

  const body = (await response.json()) as { resume: ResumeJson };
  return body.resume;
}

/** Client-side wrapper around PATCH /api/resumes/:id/primary. */
export async function setPrimaryResume(
  resumeId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResumeJson> {
  const response = await fetchImpl(`/api/resumes/${encodeURIComponent(resumeId)}/primary`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new ResumesRequestError(
      await readErrorMessage(response, `Failed to set primary resume (status ${response.status})`),
    );
  }

  const body = (await response.json()) as { resume: ResumeJson };
  return body.resume;
}

export interface UpdateResumeInput {
  label?: string;
  content?: string;
  parsedSkills?: string[];
}

/** Client-side wrapper around PATCH /api/resumes/:id — in-place content edit (label/content/parsedSkills only; primary stays setPrimaryResume's job). */
export async function updateResume(
  resumeId: string,
  input: UpdateResumeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ResumeJson> {
  const response = await fetchImpl(`/api/resumes/${encodeURIComponent(resumeId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new ResumesRequestError(
      await readErrorMessage(response, `Failed to update resume (status ${response.status})`),
    );
  }

  const body = (await response.json()) as { resume: ResumeJson };
  return body.resume;
}

/** Client-side wrapper around DELETE /api/resumes/:id. */
export async function deleteResume(
  resumeId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(`/api/resumes/${encodeURIComponent(resumeId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new ResumesRequestError(
      await readErrorMessage(response, `Failed to delete resume (status ${response.status})`),
    );
  }
}
