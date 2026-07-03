import type { JobSearchResult } from "./jobs-client";

// Local, UI-owned types describing the wire JSON returned by
// GET/POST /api/applications and PATCH /api/applications/:id/status (see
// src/app/api/_lib/serializers.ts) — deliberately not the domain
// Application entity (dates are strings here, no methods).

// Mirrors src/domain/value-objects/application-status.ts's
// APPLICATION_STATUSES — kept as a UI-local copy (like JobSearchResult
// mirrors the Job wire shape) rather than importing the domain module
// directly, so the UI only ever depends on the wire contract. Declaration
// order doubles as the funnel order used for grouping on the Applications
// screen.
export const APPLICATION_STATUSES = [
  "SAVED",
  "APPLIED",
  "HR_SCREEN",
  "TECHNICAL_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

export interface ApplicationStatusChangeJson {
  from: ApplicationStatusValue | null;
  to: ApplicationStatusValue;
  changedAt: string;
  note: string | null;
}

export interface ApplicationJson {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string | null;
  status: ApplicationStatusValue;
  appliedAt: string;
  notes: string | null;
  statusHistory: ApplicationStatusChangeJson[];
}

export interface ApplicationWithDetailsJson {
  application: ApplicationJson;
  job: JobSearchResult;
}

export interface ListApplicationsResponse {
  applications: ApplicationWithDetailsJson[];
}

/** Thrown when an applications API call responds with a non-OK status. */
export class ApplicationsRequestError extends Error {}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

/** Client-side wrapper around GET /api/applications — the only way this UI reads applications. */
export async function listApplications(
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ListApplicationsResponse> {
  const response = await fetchImpl(`/api/applications?userId=${encodeURIComponent(userId)}`);

  if (!response.ok) {
    throw new ApplicationsRequestError(
      await readErrorMessage(response, `Failed to load applications (status ${response.status})`),
    );
  }

  return (await response.json()) as ListApplicationsResponse;
}

/** Client-side wrapper around POST /api/applications — "Mark as applied". */
export async function createApplication(
  jobId: string,
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApplicationJson> {
  const response = await fetchImpl("/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, userId }),
  });

  if (!response.ok) {
    throw new ApplicationsRequestError(
      await readErrorMessage(response, `Failed to create application (status ${response.status})`),
    );
  }

  const body = (await response.json()) as { application: ApplicationJson };
  return body.application;
}

/** Client-side wrapper around DELETE /api/applications/:id — removes only the Application, never its Job or Resume. */
export async function deleteApplication(
  applicationId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(`/api/applications/${encodeURIComponent(applicationId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new ApplicationsRequestError(
      await readErrorMessage(response, `Failed to delete application (status ${response.status})`),
    );
  }
}

/** Client-side wrapper around PATCH /api/applications/:id/status. */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatusValue,
  fetchImpl: typeof fetch = fetch,
): Promise<ApplicationJson> {
  const response = await fetchImpl(
    `/api/applications/${encodeURIComponent(applicationId)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    throw new ApplicationsRequestError(
      await readErrorMessage(
        response,
        `Failed to update application status (status ${response.status})`,
      ),
    );
  }

  const body = (await response.json()) as { application: ApplicationJson };
  return body.application;
}
