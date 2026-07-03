import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseQuery } from "@/app/api/_lib/parse-request";
import { toProfileJson, toRecommendationRunJson } from "@/app/api/_lib/serializers";
import {
  buildRecommendationSearchFilters,
  RECOMMENDATION_MAX_JOBS_TO_SCORE_CAP,
} from "@/application/use-cases/build-recommendation-search-filters";
import { getContainer } from "@/lib/di/get-container";

const getDashboardQuerySchema = z.object({
  userId: z.string().trim().min(1),
});

/**
 * Read-only: loads the user's Profile/primary Resume status, Profile-derived
 * prefill filters, and the latest saved recommendation run. Never touches
 * AiProvider or the job providers — loading the Dashboard must never spend
 * AI tokens or make a live search call. Refreshing is a separate, explicit
 * POST (see ./refresh/route.ts).
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = parseQuery(new URL(request.url).searchParams, getDashboardQuerySchema);

    const container = getContainer();
    const result = await container.getDashboardRecommendations().execute(userId);

    if (!result.profile) {
      return NextResponse.json({
        status: "no_profile" as const,
        profile: null,
        prefillFilters: null,
        maxJobsToScoreCap: RECOMMENDATION_MAX_JOBS_TO_SCORE_CAP,
        latestRun: null,
      });
    }

    if (!result.primaryResume) {
      return NextResponse.json({
        status: "no_resume" as const,
        profile: toProfileJson(result.profile),
        prefillFilters: null,
        maxJobsToScoreCap: RECOMMENDATION_MAX_JOBS_TO_SCORE_CAP,
        latestRun: null,
      });
    }

    const prefillFilters = buildRecommendationSearchFilters(result.profile, result.primaryResume);

    return NextResponse.json({
      status: "ready" as const,
      profile: toProfileJson(result.profile),
      prefillFilters,
      maxJobsToScoreCap: RECOMMENDATION_MAX_JOBS_TO_SCORE_CAP,
      latestRun: result.latestRun
        ? toRecommendationRunJson(result.latestRun, result.jobsById)
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
