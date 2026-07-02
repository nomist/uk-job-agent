export const VISA_STATUSES = ["REQUIRES_SPONSORSHIP", "NO_SPONSORSHIP_NEEDED", "UNKNOWN"] as const;

export type VisaStatus = (typeof VISA_STATUSES)[number];

export function isVisaStatus(value: string): value is VisaStatus {
  return (VISA_STATUSES as readonly string[]).includes(value);
}
