// Partial shapes of the Reed Jobseeker API (v1.0) response — only the
// fields this adapter reads. Every field is optional/untyped-safe since
// this is untrusted external data.

export interface ReedJobResult {
  jobId?: number;
  employerName?: string;
  jobTitle?: string;
  locationName?: string;
  minimumSalary?: number;
  maximumSalary?: number;
  currency?: string;
  /** UK format "dd/mm/yyyy", e.g. "05/07/2026". */
  date?: string;
  jobDescription?: string;
  jobUrl?: string;
  partTime?: boolean;
  fullTime?: boolean;
}

export interface ReedSearchResponse {
  results?: ReedJobResult[];
  totalResults?: number;
}
