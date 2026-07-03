import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody } from "@/app/api/_lib/parse-request";
import { toResumeJson } from "@/app/api/_lib/serializers";
import { getContainer } from "@/lib/di/get-container";

const updateResumeBodySchema = z.object({
  label: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  parsedSkills: z.array(z.string().trim().min(1)).optional(),
});

/**
 * In-place content edit (label/content/parsedSkills). Deliberately doesn't
 * accept isPrimary — promoting a resume to primary stays the job of PATCH
 * /api/resumes/:id/primary (SetPrimaryResumeUseCase), so there's exactly
 * one code path that keeps "at most one primary per profile" true.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, updateResumeBodySchema);

    const container = getContainer();
    const resume = await container.updateResume().execute({ resumeId: id, ...body });

    return NextResponse.json({ resume: toResumeJson(resume) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Rejects deleting a profile's only resume, and reassigns primary to the
 * most recently added remaining resume if the deleted one was primary —
 * see DeleteResumeUseCase.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const container = getContainer();
    await container.deleteResume().execute({ resumeId: id });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
