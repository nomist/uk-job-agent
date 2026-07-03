import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDefaultResume } from "@/app/api/_lib/ensure-default-resume";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody } from "@/app/api/_lib/parse-request";
import { toMatchScoreJson } from "@/app/api/_lib/serializers";
import { getContainer } from "@/lib/di/get-container";

const scoreJobBodySchema = z
  .object({
    // No profile-management UI exists yet, so our own UI sends userId and
    // omits profileId/resumeId — a default profile+resume is resolved
    // server-side (see ensure-default-resume.ts). A caller that does have a
    // real profileId can still pass one explicitly instead.
    userId: z.string().trim().min(1).optional(),
    profileId: z.string().trim().min(1).optional(),
    resumeId: z.string().trim().min(1).optional(),
  })
  .refine((body) => body.userId ?? body.profileId, {
    message: "Either userId or profileId is required",
  });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, scoreJobBodySchema);
    const container = getContainer();

    let profileId = body.profileId;
    let resumeId = body.resumeId;
    if (!profileId) {
      // The schema's refine() already guarantees userId is set whenever
      // profileId is absent.
      const defaults = await ensureDefaultResume(container, body.userId as string);
      profileId = defaults.profileId;
      resumeId = defaults.resumeId;
    }

    const matchScore = await container.scoreJobMatch().execute({ jobId: id, profileId, resumeId });

    return NextResponse.json({ matchScore: toMatchScoreJson(matchScore) });
  } catch (error) {
    return handleApiError(error);
  }
}
