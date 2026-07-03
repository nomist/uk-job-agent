"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DashboardRecommendationsResponse,
  getDashboardRecommendations,
} from "@/lib/api/dashboard-client";

export type DashboardLoadStatus = "loading" | "success" | "error";

export interface UseDashboardRecommendationsResult {
  status: DashboardLoadStatus;
  data: DashboardRecommendationsResponse | undefined;
  errorMessage: string | undefined;
  refetch: () => void;
}

/**
 * Fetch-on-mount load of the Dashboard's status (Profile/Resume setup,
 * prefill filters, latest saved run) — read-only, calls GET
 * /api/dashboard/recommendations only. Deliberately separate from
 * useRefreshRecommendations: loading the Dashboard must never spend AI
 * tokens, and this hook never calls the refresh endpoint.
 */
export function useDashboardRecommendations(userId: string): UseDashboardRecommendationsResult {
  const [status, setStatus] = useState<DashboardLoadStatus>("loading");
  const [data, setData] = useState<DashboardRecommendationsResponse>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const fetchDashboard = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(undefined);
    try {
      const result = await getDashboardRecommendations(userId);
      setData(result);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    // Fetch-on-mount is a legitimate effect (syncing local state with a
    // server resource on load) — see job-detail-screen.tsx for why
    // react-hooks/set-state-in-effect flags it anyway.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDashboard();
  }, [fetchDashboard]);

  function refetch() {
    void fetchDashboard();
  }

  return { status, data, errorMessage, refetch };
}
