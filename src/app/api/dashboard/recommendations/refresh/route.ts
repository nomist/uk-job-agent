import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody } from "@/app/api/_lib/parse-request";
import { toRecommendationRunJson } from "@/app/api/_lib/serializers";
import { ProfileNotFoundError } from "@/application/errors/application-errors";
import { VISA_STATUSES } from "@/domain/value-objects/visa-status";
import { WORK_MODES } from "@/domain/value-objects/work-mode";
import { getContainer } from "@/lib/di/get-container";

const refreshRecommendationsBodySchema = z.object({
  userId: z.string().trim().min(1),
  filters: z
    .object({
      headline: z.string().trim().min(1).optional(),
      skills: z.array(z.string().trim().min(1)).optional(),
      locations: z.array(z.string().trim().min(1)).optional(),
      workModes: z.array(z.enum(WORK_MODES)).optional(),
      salaryMin: z.number().nonnegative().optional(),
      salaryMax: z.number().nonnegative().optional(),
      salaryCurrency: z.string().trim().min(1).optional(),
      visaStatus: z.enum(VISA_STATUSES).optional(),
      yearsOfExperience: z.number().int().min(0).optional(),
      maxJobsToScore: z.number().int().positive().optional(),
    })
    .optional(),
  forceRescore: z.boolean().optional(),
});

/**
 * The ONLY route that spends AI tokens for the Dashboard — every call here
 * is a direct result of the user clicking "Refresh recommendations" (see
 * useRefreshRecommendations); nothing calls this on a schedule or on page
 * load. See RunRecommendationsUseCase for the full search -> filter ->
 * pre-rank -> cap -> score flow and its cost controls.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, refreshRecommendationsBodySchema);
    const container = getContainer();

    const profile = await container.dependencies.profileRepository.findByUserId(body.userId);
    if (!profile) {
      throw new ProfileNotFoundError(body.userId);
    }

    await container.runRecommendations().execute({
      profileId: profile.id,
      filters: body.filters,
      forceRescore: body.forceRescore,
    });

    // Re-read through the same hydrated shape the GET route uses, rather
    // than hand-rolling job hydration a second time here.
    const result = await container.getDashboardRecommendations().execute(body.userId);

    return NextResponse.json({
      run: result.latestRun ? toRecommendationRunJson(result.latestRun, result.jobsById) : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
