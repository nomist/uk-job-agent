import { useAiAction, type UseAiActionResult } from "@/components/shared/use-ai-action";
import {
  RecommendationRunJson,
  RecommendationSearchFiltersJson,
  refreshRecommendations,
} from "@/lib/api/dashboard-client";

/**
 * The one and only way this UI spends AI tokens on recommendations —
 * built on useAiAction, which never auto-triggers (see that hook's own
 * comment); `run()` only ever fires from the "Refresh recommendations"
 * button's onClick.
 */
export function useRefreshRecommendations(
  userId: string,
  filters: Partial<RecommendationSearchFiltersJson>,
  forceRescore: boolean,
): UseAiActionResult<RecommendationRunJson> {
  return useAiAction(() => refreshRecommendations({ userId, filters, forceRescore }));
}
