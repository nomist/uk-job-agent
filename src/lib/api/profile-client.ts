import { CURRENT_USER_ID } from "./current-user";

// Local, UI-owned types describing the wire JSON returned by
// GET/PUT /api/profile (see src/app/api/_lib/serializers.ts). Mirrors the
// domain value lists (WorkMode, VisaStatus) rather than importing them —
// same reasoning as APPLICATION_STATUSES in applications-client.ts.

export const WORK_MODES = ["REMOTE", "HYBRID", "ONSITE"] as const;
export type WorkModeValue = (typeof WORK_MODES)[number];

export const VISA_STATUSES = ["REQUIRES_SPONSORSHIP", "NO_SPONSORSHIP_NEEDED", "UNKNOWN"] as const;
export type VisaStatusValue = (typeof VISA_STATUSES)[number];

export interface SalaryExpectationJson {
  min: number;
  max: number;
  currency: string;
}

export interface ProfileJson {
  id: string;
  userId: string;
  headline: string | null;
  yearsOfExperience: number | null;
  skills: string[];
  preferredLocations: string[];
  workPreferences: WorkModeValue[];
  visaStatus: VisaStatusValue;
  salaryExpectation: SalaryExpectationJson | null;
  updatedAt: string;
}

export interface UpsertProfileInput {
  headline?: string;
  yearsOfExperience?: number;
  skills?: string[];
  preferredLocations?: string[];
  workPreferences?: WorkModeValue[];
  visaStatus?: VisaStatusValue;
  salaryExpectation?: SalaryExpectationJson;
}

/** Thrown when a profile API call responds with a non-OK status. */
export class ProfileRequestError extends Error {}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

/** Client-side wrapper around GET /api/profile — returns null if the user has no profile yet. */
export async function getProfile(fetchImpl: typeof fetch = fetch): Promise<ProfileJson | null> {
  const response = await fetchImpl(`/api/profile?userId=${encodeURIComponent(CURRENT_USER_ID)}`);

  if (!response.ok) {
    throw new ProfileRequestError(
      await readErrorMessage(response, `Failed to load profile (status ${response.status})`),
    );
  }

  const body = (await response.json()) as { profile: ProfileJson | null };
  return body.profile;
}

/** Client-side wrapper around PUT /api/profile — creates or replaces the user's profile. */
export async function saveProfile(
  input: UpsertProfileInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProfileJson> {
  const response = await fetchImpl("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: CURRENT_USER_ID, ...input }),
  });

  if (!response.ok) {
    throw new ProfileRequestError(
      await readErrorMessage(response, `Failed to save profile (status ${response.status})`),
    );
  }

  const body = (await response.json()) as { profile: ProfileJson };
  return body.profile;
}
