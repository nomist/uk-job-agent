import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody, parseQuery } from "@/app/api/_lib/parse-request";
import { toProfileJson } from "@/app/api/_lib/serializers";
import { VISA_STATUSES } from "@/domain/value-objects/visa-status";
import { WORK_MODES } from "@/domain/value-objects/work-mode";
import { getContainer } from "@/lib/di/get-container";

const getProfileQuerySchema = z.object({
  userId: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = parseQuery(new URL(request.url).searchParams, getProfileQuerySchema);

    const container = getContainer();
    const profile = await container.dependencies.profileRepository.findByUserId(userId);

    return NextResponse.json({ profile: profile ? toProfileJson(profile) : null });
  } catch (error) {
    return handleApiError(error);
  }
}

const upsertProfileBodySchema = z.object({
  userId: z.string().trim().min(1),
  headline: z.string().trim().min(1).optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  skills: z.array(z.string().trim().min(1)).optional(),
  preferredLocations: z.array(z.string().trim().min(1)).optional(),
  workPreferences: z.array(z.enum(WORK_MODES)).optional(),
  visaStatus: z.enum(VISA_STATUSES).optional(),
  salaryExpectation: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string().trim().min(1),
    })
    .optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, upsertProfileBodySchema);

    const container = getContainer();
    const profile = await container.upsertProfile().execute(body);

    return NextResponse.json({ profile: toProfileJson(profile) });
  } catch (error) {
    return handleApiError(error);
  }
}
