import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDefaultResume } from "@/app/api/_lib/ensure-default-resume";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody } from "@/app/api/_lib/parse-request";
import { getContainer } from "@/lib/di/get-container";

const coverLetterBodySchema = z
  .object({
    // See score/route.ts: no profile-management UI exists yet, so our own
    // UI sends userId and omits profileId/resumeId — a default profile+
    // resume is resolved server-side (see ensure-default-resume.ts).
    userId: z.string().trim().min(1).optional(),
    profileId: z.string().trim().min(1).optional(),
    resumeId: z.string().trim().min(1).optional(),
    tone: z.enum(["FORMAL", "ENTHUSIASTIC", "CONCISE"]).optional(),
  })
  .refine((body) => body.userId ?? body.profileId, {
    message: "Either userId or profileId is required",
  });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, coverLetterBodySchema);
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

    const result = await container.generateCoverLetter().execute({
      jobId: id,
      profileId,
      resumeId,
      tone: body.tone,
    });

    return NextResponse.json({
      coverLetter: {
        content: result.content,
        modelVersion: result.modelVersion,
        generatedAt: result.generatedAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
