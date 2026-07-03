"use client";

import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/jobs/empty-state";
import { ErrorState } from "@/components/jobs/error-state";
import { LoadingState } from "@/components/jobs/loading-state";
import { createApplication } from "@/lib/api/applications-client";
import { CURRENT_USER_ID } from "@/lib/api/current-user";
import type { RecommendationSearchFiltersJson } from "@/lib/api/dashboard-client";
import { dismissJob, saveJob } from "@/lib/api/saved-jobs-client";
import { useDashboardRecommendations } from "./hooks/use-dashboard-recommendations";
import { useRefreshRecommendations } from "./hooks/use-refresh-recommendations";
import { PartialScoringFailureNotice } from "./partial-scoring-failure-notice";
import { RecommendationFiltersForm } from "./recommendation-filters-form";
import { RecommendationList } from "./recommendation-list";
import { RecommendationRunSummary } from "./recommendation-run-summary";
import { SetupPrompt } from "./setup-prompt";

export function DashboardScreen() {
  const dashboard = useDashboardRecommendations(CURRENT_USER_ID);
  const [formFilters, setFormFilters] = useState<RecommendationSearchFiltersJson>();
  const [forceRescore, setForceRescore] = useState(false);
  const hasPrefilledRef = useRef(false);

  useEffect(() => {
    // Prefill the form from the Profile-derived defaults exactly once, the
    // first time the Dashboard finishes loading — after that, the user's
    // own edits must never be clobbered by a re-render or refetch.
    if (dashboard.data?.prefillFilters && !hasPrefilledRef.current) {
      setFormFilters(dashboard.data.prefillFilters);
      hasPrefilledRef.current = true;
    }
  }, [dashboard.data]);

  const refresh = useRefreshRecommendations(CURRENT_USER_ID, formFilters ?? {}, forceRescore);

  async function handleSaveJob(jobId: string) {
    await saveJob(jobId, CURRENT_USER_ID);
  }

  async function handleDismissJob(jobId: string) {
    await dismissJob(jobId, CURRENT_USER_ID);
  }

  async function handleMarkApplied(jobId: string) {
    await createApplication(jobId, CURRENT_USER_ID);
  }

  if (dashboard.status === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <LoadingState />
      </main>
    );
  }

  if (dashboard.status === "error" || !dashboard.data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState
          message={dashboard.errorMessage ?? "Unknown error"}
          onRetry={dashboard.refetch}
        />
      </main>
    );
  }

  const { data } = dashboard;

  if (data.status === "no_profile") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <SetupPrompt
          title="Set up your profile first"
          description="Recommendations are built from your Profile and primary Resume — add your profile to get started."
          href="/profile"
          linkLabel="Go to Profile"
        />
      </main>
    );
  }

  if (data.status === "no_resume") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <SetupPrompt
          title="Add a primary resume"
          description="Recommendations need a primary Resume to score against — add one to get started."
          href="/resumes"
          linkLabel="Go to Resumes"
        />
      </main>
    );
  }

  // Prefer the just-refreshed run once available; otherwise show the run
  // that was already saved from a previous visit.
  const displayedRun = refresh.result ?? data.latestRun;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ranked job recommendations built from your Profile and primary Resume.
        </p>
      </div>

      {formFilters ? (
        <RecommendationFiltersForm
          values={formFilters}
          onChange={setFormFilters}
          forceRescore={forceRescore}
          onForceRescoreChange={setForceRescore}
          maxJobsToScoreCap={data.maxJobsToScoreCap}
          disabled={refresh.status === "loading"}
          onRefresh={() => void refresh.run()}
        />
      ) : null}

      {refresh.status === "error" ? (
        <ErrorState
          message={refresh.errorMessage ?? "Unknown error"}
          onRetry={() => void refresh.run()}
        />
      ) : null}

      {displayedRun ? (
        <>
          <RecommendationRunSummary run={displayedRun} />
          <PartialScoringFailureNotice failedCount={displayedRun.failedCount} />
          <RecommendationList
            items={displayedRun.items}
            onSaveJob={handleSaveJob}
            onDismissJob={handleDismissJob}
            onMarkApplied={handleMarkApplied}
          />
        </>
      ) : (
        <EmptyState
          title="No recommendations yet"
          description="Click Refresh recommendations above to generate your first batch."
        />
      )}
    </main>
  );
}
