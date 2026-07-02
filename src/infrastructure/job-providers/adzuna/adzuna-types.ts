// Partial shapes of the Adzuna Job Search API v1 response — only the fields
// this adapter reads. Every field is optional/untyped-safe since this is
// untrusted external data.

export interface AdzunaLocation {
  area?: string[];
  display_name?: string;
}

export interface AdzunaCompany {
  display_name?: string;
}

export interface AdzunaJobResult {
  id?: string;
  title?: string;
  description?: string;
  redirect_url?: string;
  company?: AdzunaCompany;
  location?: AdzunaLocation;
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  contract_time?: string;
  created?: string;
}

export interface AdzunaApiResponse {
  results?: AdzunaJobResult[];
  count?: number;
}
