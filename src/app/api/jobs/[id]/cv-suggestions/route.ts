import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDefaultResume } from "@/app/api/_lib/ensure-default-resume";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody } from "@/app/api/_lib/parse-request";
import { getContainer } from "@/lib/di/get-container";

const cvSuggestionsBodySchema = z
  .object({
    // See score/route.ts: no resume-management UI exists yet, so our own UI
    // sends userId and omits resumeId — a default resume is resolved
    // server-side (see ensure-default-resume.ts).
    userId: z.string().trim().min(1).optional(),
    resumeId: z.string().trim().min(1).optional(),
  })
  .refine((body) => body.userId ?? body.resumeId, {
    message: "Either userId or resumeId is required",
  });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, cvSuggestionsBodySchema);
    const container = getContainer();

    // The schema's refine() already guarantees userId is set whenever
    // resumeId is absent.
    const resumeId =
      body.resumeId ?? (await ensureDefaultResume(container, body.userId as string)).resumeId;

    const result = await container.suggestCvImprovements().execute({
      resumeId,
      targetJobId: id,
    });

    return NextResponse.json({
      suggestions: result.suggestions,
      modelVersion: result.modelVersion,
      generatedAt: result.generatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
