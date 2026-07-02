import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody, parseQuery } from "@/app/api/_lib/parse-request";
import { toSavedJobJson } from "@/app/api/_lib/serializers";
import { getContainer } from "@/lib/di/get-container";

const saveJobBodySchema = z.object({
  userId: z.string().trim().min(1),
  notes: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, saveJobBodySchema);

    const container = getContainer();
    const record = await container
      .saveJob()
      .execute({ userId: body.userId, jobId: id, notes: body.notes });

    return NextResponse.json({ savedJob: toSavedJobJson(record) });
  } catch (error) {
    return handleApiError(error);
  }
}

const unsaveJobQuerySchema = z.object({
  userId: z.string().trim().min(1),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = parseQuery(new URL(request.url).searchParams, unsaveJobQuerySchema);

    const container = getContainer();
    // "Un-save" is implemented via DismissJobUseCase (status -> DISMISSED):
    // SavedJobRepository has no delete/remove method, and Application/
    // Domain aren't being modified for this milestone, so removing a job
    // from the saved list is expressed as the existing dismiss transition
    // rather than a hard row delete.
    const record = await container.dismissJob().execute({ userId, jobId: id });

    return NextResponse.json({ savedJob: toSavedJobJson(record) });
  } catch (error) {
    return handleApiError(error);
  }
}
