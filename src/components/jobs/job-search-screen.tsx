"use client";

import { useState } from "react";
import { createApplication } from "@/lib/api/applications-client";
import { CURRENT_USER_ID } from "@/lib/api/current-user";
import { searchJobs, type JobSearchResult } from "@/lib/api/jobs-client";
import { saveJob } from "@/lib/api/saved-jobs-client";
import { JobFilters, type JobFiltersValues } from "./job-filters";
import { JobResultsList, type JobResultsStatus } from "./job-results-list";
import { MockDataNotice } from "./mock-data-notice";
import { NoProvidersConfiguredNotice } from "./no-providers-configured-notice";
import { ProvidersDegradedNotice } from "./providers-degraded-notice";
import { SearchForm, type SearchFormValues } from "./search-form";

const INITIAL_FILTERS: JobFiltersValues = { salaryMin: "", remoteOnly: false, provider: "" };
const INITIAL_KEYWORDS: SearchFormValues = { q: "", location: "" };

export function JobSearchScreen() {
  const [lastSearch, setLastSearch] = useState<SearchFormValues>(INITIAL_KEYWORDS);
  const [filters, setFilters] = useState<JobFiltersValues>(INITIAL_FILTERS);
  const [status, setStatus] = useState<JobResultsStatus>("idle");
  const [jobs, setJobs] = useState<JobSearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isMock, setIsMock] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [failedProviders, setFailedProviders] = useState<string[]>([]);

  async function runSearch(next: SearchFormValues) {
    setLastSearch(next);
    setStatus("loading");
    setErrorMessage(undefined);

    const salaryMin = filters.salaryMin ? Number(filters.salaryMin) : undefined;

    try {
      const result = await searchJobs({
        q: next.q || undefined,
        location: next.location || undefined,
        salaryMin: salaryMin !== undefined && !Number.isNaN(salaryMin) ? salaryMin : undefined,
        remoteOnly: filters.remoteOnly,
        provider: filters.provider || undefined,
      });
      setJobs(result.jobs);
      setIsMock(result.isMock);
      setConfiguredProviders(result.configuredProviders);
      setFailedProviders(result.failedProviders);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function handleRetry() {
    void runSearch(lastSearch);
  }

  async function handleSaveJob(jobId: string) {
    await saveJob(jobId, CURRENT_USER_ID);
  }

  async function handleMarkApplied(jobId: string) {
    await createApplication(jobId, CURRENT_USER_ID);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Job Search</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Search live listings from Adzuna and Reed.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SearchForm onSearch={runSearch} disabled={status === "loading"} />
        <JobFilters values={filters} onChange={setFilters} disabled={status === "loading"} />
      </div>

      {status === "success" && isMock ? <MockDataNotice /> : null}
      {status === "success" && !isMock && configuredProviders.length === 0 ? (
        <NoProvidersConfiguredNotice />
      ) : null}
      {status === "success" ? <ProvidersDegradedNotice failedProviders={failedProviders} /> : null}

      <JobResultsList
        status={status}
        jobs={jobs}
        errorMessage={errorMessage}
        onRetry={handleRetry}
        onSaveJob={handleSaveJob}
        onMarkApplied={handleMarkApplied}
      />
    </main>
  );
}
